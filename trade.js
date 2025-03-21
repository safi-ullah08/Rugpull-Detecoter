// Define async function to swap tokens
const { ethers } = require("ethers");
const { Web3 } = require("web3");
const Big = require("big.js");
const axios = require("axios");
const { NonceManager } = require("@ethersproject/experimental");

require("dotenv").config();
const { v2routerABI } = require("./abis/V2Router02ABI.js");
const { v3routerABI } = require("./abis/V3Router02ABI.js");
const { ERC20ABI } = require("./abis/erc20ABI.js");
const V2PairABI = require("./abis/V2PairABI.js");
const V3PairABI = require("./abis/V3PairABI.js");

const SwapV2RouterAddress = "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24";
const SwapV3RouterAddress = "0x2626664c2603336e57b271c5c0b26f421741e481";
const provider = new ethers.JsonRpcProvider(
  `https://rpc.ankr.com/base/${process.env.WSS_ALCHEMY_API_KEY}`
);

const account = new ethers.Wallet(process.env.PRIVATE_KEY, provider); // private key here
const manager = new NonceManager(account);

let weth = "0x4200000000000000000000000000000000000006";

const deadlineFromMinutes = (minutes) =>
  Math.floor(Date.now() / 1000 + minutes * 60);

const swapV2Contract = new ethers.Contract(
  SwapV2RouterAddress,
  v2routerABI,
  provider
);

const swapV3Contract = new ethers.Contract(
  SwapV3RouterAddress,
  v3routerABI,
  provider
);

async function getPairAddress(contractAddress1, exchangeName) {
  const weth = "0x4200000000000000000000000000000000000006";

  const url = `https://deep-index.moralis.io/api/v2.2/${contractAddress1}/${weth}/pairAddress?chain=base&exchange=${exchangeName}`;
  const headers = {
    accept: "application/json",
    "X-API-Key": process.env.MORALIS_API,
  };
  try {
    const response = await axios.get(url, { headers });
    if (response.status === 200) {
      return response.data.pairAddress;
    }
    if (response.status === 404) {
      return undefined;
    }
  } catch (error) {
    return undefined;
  }
  return null;
}

async function getAmountIn(amountOut, res0, res1) {
  return await swapV2Contract
    .connect(account)
    .getAmountOut(amountOut, res0, res1)
    .call();
}

async function getAmountOut(amountIn, res0, res1) {
  return await swapV2Contract
    .connect(account)
    .getAmountOut.staticCall(amountIn, res0, res1);
}
async function getProtocolFee(contractAddress) {
  const web3 = new Web3(
    new Web3.providers.WebsocketProvider(
      `wss://base-mainnet.g.alchemy.com/v2/${process.env.WSS_ALCHEMY_API_KEY}`
    )
  );
  const contract = new web3.eth.Contract(V3PairABI, contractAddress);
  let fee = await contract.methods.fee().call();
  console.log("fee", fee);
  return fee;
}

async function getReserves(pairAddress) {
  const url = `https://deep-index.moralis.io/api/v2.2/${pairAddress}/reserves?chain=base`;
  const headers = {
    accept: "application/json",
    "X-API-Key": process.env.MORALIS_API,
  };
  try {
    const response = await axios.get(url, { headers });
    if (response.status === 200) {
      return response.data;
    }
    if (response.status === 404) {
      return undefined;
    }
  } catch (error) {
    console.log(error);
    return undefined;
  }
  return null;
}

async function buyV2(amountIn, amountOutMin, path, recipient, deadline) {
  try {
    let nonce = await provider.getTransactionCount(
      process.env.WALLET_ADDRESS,
      "latest"
    );

    let projectNonce = nonce + 1;
    console.log("current nonce", nonce);
    console.log("projected once", projectNonce);

    let tx = await swapV2Contract
      .connect(account)
      .swapETHForExactTokens(amountOutMin, path, recipient, deadline, {
        value: amountIn,
        nonce: nonce,
      });

    await tx.wait();
    console.log("tx hash", tx.hash);
    return tx;
  } catch (error) {
    console.log(error);
  }
}

async function buyV3(amountIn, amountOutMin, path, recipient, fee) {
  try {
    let exactInputSingleParams = [
      path[0],
      path[1],
      fee,
      recipient,
      amountIn,
      (amountOutMin = 1),
      (sqrtPriceLimitX96 = 0),
    ];
    let nonce = await provider.getTransactionCount(
      process.env.WALLET_ADDRESS,
      "latest"
    );

    let tx = await swapV3Contract
      .connect(account)
      .exactInputSingle(exactInputSingleParams, {
        value: amountIn,
        nonce: nonce,
      });

    await tx.wait(10);
    return tx;
  } catch (error) {
    console.log(error);
  }
}

async function approveTransaction(contract, amountIn) {
  const ERC20 = new ethers.Contract(contract, ERC20ABI, provider);

  let confirm_approval = await ERC20.connect(account).approve(
    SwapV2RouterAddress,
    amountIn,
    {
      nonce: (await account.getNonce()) + 1,
    }
  );

  confirm_approval.wait();
}

async function sell(amountIn, amountOutMin, path, recipient, deadline) {
  console.log("sell called");
  let tx = await swapV2Contract
    .connect(account)
    .swapExactETHForTokens(amountIn, amountOutMin, path, recipient, deadline, {
      gasLimit: 1_000_0000,
      gasPrice: await account,
      value: 0,
      nonce: (await account.getNonce()) + 4,
    });
  console.log("wait");
  console.log(tx);
  return tx;
}

async function getBalance(contract) {
  const ERC20 = new ethers.Contract(contract, ERC20ABI, provider);
  const balance = await ERC20.balanceOf.staticCall(
    process.env.WALLET_ADDRESS
  );
  return balance;
}

async function trade(contract, amountIn, amountOut, tradeVersion, fee = 0) {
  try {
    if (tradeVersion === "V2") {
      let buyV2_tx = await buyV2(
        amountIn,
        amountOut,
        [weth, contract],
        process.env.WALLET_ADDRESS,
        deadlineFromMinutes(10)
      );
      if (!buyV2_tx) return false;

      console.log("waiting for buyV2");
      buyV2_tx.wait();
      console.log("buyV2 done", buyV2_tx);

      return true;
    }

    if (tradeVersion === "V3") {
      let buyV3_tx = await buyV3(
        amountIn,
        amountOut,
        [weth, contract],
        process.env.WALLET_ADDRESS,
        fee
      );
      if (!buyV3_tx) return false;
      console.log("waiting for buyV3");
      // buyV3_tx.wait();
      console.log("buyV3 done", buyV3_tx);

      return true;
    }
    console.log("Something is wrong\n");
    console.info(
      `Args-> ${amountIn}, ${amountOutMi}n, ${path}, ${recipien}t, ${deadline}`
    );
    return false;
  } catch (e) {
    console.log(e);
    return false;
  }
}

async function calculatePrice(x, y) {
  return Big(x).div(Big(y));
}

async function getPair(contractAddress) {
  try {
    let uniswapv2 = await getPairAddress(contractAddress, "uniswapv2");
    let uniswapv3 = await getPairAddress(contractAddress, "uniswapv3");
    console.log("V2: ", uniswapv2);
    console.log("V3: ", uniswapv3);

    if (uniswapv2) return [uniswapv2, "V2"];
    else return [uniswapv3, "V3"];
  } catch (error) {
    return false;
  }
}

async function makeATrade(contract) {
  if (contract) {
    try {
      console.log("contract Address", contract);
      let pair = await getPair(contract);
      console.log("pair", pair);
      let pairAddress = pair[0];
      let tradeVersion = pair[1];

      if (!pairAddress) {
        console.log("pair not found");
        return false;
      }
      let reserves = await getReserves(pairAddress, tradeVersion);
      let fee;
      console.log(reserves);
      if (tradeVersion == "V3") fee = await getProtocolFee(pairAddress);
      let amountOut = await getAmountOut(
        290551000000000,
        reserves.reserve0,
        reserves.reserve1
      );
      console.log("amount out", amountOut);

      return await trade(
        contract,
        290551000000000,
        amountOut,
        tradeVersion,
        fee
      );
    } catch (error) {
      console.log(error);
      return false;
    }
  } else {
    console.log("No contract address");
  }
}

module.exports = {
  makeATrade,
};
