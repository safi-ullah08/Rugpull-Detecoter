const { Web3 } = require("web3");
const axios = require("axios");
const sqlite3 = require("sqlite3").verbose();
require("dotenv").config();
const ERC20ABI = require("./abis/ERC20.js");
const V3PairABI = require("./abis/V3PairABI.js");
const V2PairABI = require("./abis/V2PairABI.js");
// Connect to the Ethereum network via Infura
const web3 = new Web3(
  new Web3.providers.WebsocketProvider(
    `wss://rpc.ankr.com/base/ws/1064904a1346f3bbe38b5476279a70d380940af47a61d7269a3a177971ff086b`
  )
);
// Cost saving -> Use the function signature and query only using ethers js to find addLiquidity and removeLiqudity

const getReserves = async (address) => {
  try {
    const moralisApiUrl = 'https://deep-index.moralis.io/api/v2.2';

    const response = await axios.get(`${moralisApiUrl}/${address}/reserves?chain=base`, {
      headers: {
        'accept': 'application/json',
        'X-API-Key': process.env.MORALIS_API
      }
    });
    return response.data;
  } catch (error) {
    console.error(error);
    if(response.status === 404)return false;
    return undefined
  }
};

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
    // console.error(error);
    return undefined;
  }
  return null;
}

async function fetchTransactionsForWallet(walletAddress) {
  const url = `https://deep-index.moralis.io/api/v2.2/${walletAddress}/verbose?chain=base&order=DESC`;
  const headers = {
    accept: "application/json",
    "X-API-Key": process.env.MORALIS_API,
  };

  const response = await axios.get(url, { headers });

  return response.data;
}

async function searchV2(contractAddress) {
  const contract = new web3.eth.Contract(V2PairABI, contractAddress);
  const res = await contract.methods.getReserves().call();
  if (res._reserve0 < 2612975) {
    return true;
  }
  return false;
}

async function searchV3(contractAddress) {
  const contract = new web3.eth.Contract(V3PairABI, contractAddress);
  const liq = await contract.methods.liquidity().call();
  if (liq > 2612975) {
    return false;
  }
  return true;
}

async function getContractFromPairForV3(contractAddress) {
  const contract = new web3.eth.Contract(V3PairABI, contractAddress);
  const token0 = await contract.methods.token0().call();
  const token1 = await contract.methods.token1().call();

  if (token0 == "0x4200000000000000000000000000000000000006") {
    return token1;
  }
  return token0;
}

async function isHistoricRugPull(pairAddress, contractAddress, protocol) {
  let wallet_audit = {
    V2RemoveLiq: false,
    V3RemoveLiq: false,
    excessiveMint: false,
    clean: undefined,
  };
  if (await searchExcisveMint(contractAddress)) {
    wallet_audit.excessiveMint = true;
    wallet_audit.clean = !wallet_audit.excessiveMint;
    return wallet_audit;
  }
  if (protocol == "v2") {
    wallet_audit.V2RemoveLiq = await searchV2(pairAddress);
    wallet_audit.clean = !wallet_audit.V2RemoveLiq;
    return wallet_audit;
  }
  if (protocol == "v3") {
    wallet_audit.V3RemoveLiq = await searchV3(pairAddress);
    wallet_audit.clean = !wallet_audit.V3RemoveLiq;
    return wallet_audit;
  }

  wallet_audit.clean = true;
  return wallet_audit;
}

async function getTotalSupply(contractAddress) {
  const web3 = new Web3(
    new Web3.providers.WebsocketProvider(
      `wss://base-mainnet.g.alchemy.com/v2/${process.env.WSS_ALCHEMY_API_KEY}`
    )
  );

  const contract = new web3.eth.Contract(ERC20ABI, contractAddress);

  try {
    const supply = await contract.methods.totalSupply().call();

    return supply; // The contract is likely ERC-20 compliant
  } catch (error) {
    console.error("Contract does not appear to be ERC-20 compliant:");
    return undefined; // The contract is not ERC-20 compliant
  }
}

async function fetchTokenTransfers(contractAddress) {
  const url = `https://deep-index.moralis.io/api/v2.2/erc20/${contractAddress}/transfers?chain=base&order=DESC`;
  const headers = {
    accept: "application/json",
    "X-API-Key": process.env.MORALIS_API,
  };

  const response = await axios.get(url, { headers });
  return response.data;
}

function stringStartsWith(haystack, needle) {
  return haystack.substr(0, needle.length) === needle;
}

async function searchExcisveMint(contractAddress) {
  let data = (await fetchTokenTransfers(contractAddress)).result;
  let totalSupply = await getTotalSupply(contractAddress);
  for (let index = 0; index < data.length; index++) {
    const tx = data[index];
    if (tx.value > totalSupply) {
      return true;
    }
  }

  return false;
}
function removeLiqV2Search(data) {
  for (let i = 0; i < data.length; i++) {
    const tx = data[i];
    if (
      tx.decoded_call &&
      stringStartsWith(tx.decoded_call.signature, "removeLiquidity")
    ) {
      console.log("v2", tx.hash);
      return true;
    }
  }
  return false;
}

function removeLiqV3Search(data) {
  for (let i = data.length - 1; i >= 0; i--) {
    const tx = data[i];
    logs = tx.logs;
    for (let index = 0; index < logs.length; index++) {
      const log = logs[index];
      if (
        log.decoded_event &&
        stringStartsWith(log.decoded_event.signature, "DecreaseLiquidity")
      ) {
        console.log("v3", tx.hash);
        return true;
      }
    }
  }
  return false;
}

async function shallowRemoveLiqSearch(data) {
  let isScam = false;
  isV2Scam = removeLiqV2Search(data);
  isV3Scam = removeLiqV3Search(data);
  isScam = isV2Scam || isV3Scam;

  return isScam;
}

async function selfDestructSearchShallow(data, address) {
  if (data.length === 1) {
    return true;
  }

  return false;
}

async function findTheFirstInstance(data, address) {
  for (let i = data.length - 1; i >= 0; i--) {
    const tx = data[i];
    if (
      tx.input == "0x" &&
      tx.to_address.toLowerCase() == address.toLowerCase()
    ) {
      const firstInAddress = await fetchTransactionsForWallet(tx.from_address);
      return firstInAddress;
    }
  }
  return undefined;
}

async function findTheFirstInAddress(data, address) {
  for (let i = data.length - 1; i >= 0; i--) {
    const tx = data[i];
    if (
      tx.input == "0x" &&
      tx.to_address.toLowerCase() == address.toLowerCase()
    ) {
      return tx.from_address;
    }
  }
  return undefined;
}

const shallowWalletAudit = async (contractAddress, address) => {
  let wallet_audit = {
    naiveV2RemoveLiq: false,
    naiveV3RemoveLiq: false,
    shallowRemoveLiq: false,
    naiveSelfDestruct: false,
    shallowSelfDestruct: false,
    excessiveMint: false,
    clean: undefined,
  };

  if (address) {
    try {
      const response = await fetchTransactionsForWallet(address);
      const data = response.result;
      const firstInAddress = await findTheFirstInstance(data, address);
      const logs = [];
      wallet_audit.naiveV2RemoveLiq = removeLiqV2Search(data);
      if (wallet_audit.naiveV2RemoveLiq) {
        wallet_audit.clean = false;
        console.log("v2");
        return wallet_audit;
      }
      wallet_audit.naiveV3RemoveLiq = removeLiqV3Search(data);
      if (wallet_audit.naiveV3RemoveLiq) {
        wallet_audit.clean = false;
        console.log("v3");

        return wallet_audit;
      }

      wallet_audit.naiveSelfDestruct = !firstInAddress;
      if (wallet_audit.naiveSelfDestruct) {
        console.log(firstInAddress);
        wallet_audit.clean = false;
        console.log("boom");

        return wallet_audit;
      }

      wallet_audit.shallowRemoveLiq = await shallowRemoveLiqSearch(
        firstInAddress.result
      );
      if (wallet_audit.shallowRemoveLiq) {
        wallet_audit.clean = false;
        console.log("shallow remove");
        return wallet_audit;
      }
      wallet_audit.shallowSelfDestruct = await selfDestructSearchShallow(
        firstInAddress.result
      );
      if (wallet_audit.shallowSelfDestruct) {
        wallet_audit.clean = false;
        console.log("shallow boom");
        return wallet_audit;
      }
      wallet_audit.excessiveMint = await searchExcisveMint(contractAddress);
      if (wallet_audit.shallowSelfDestruct) {
        wallet_audit.clean = false;
        console.log("mint");
        return wallet_audit;
      }
      wallet_audit.clean = true;
      return wallet_audit;
    } catch (error) {
      return error;
    }
  }
  return undefined;
};

const isAddressExchange = (address) => {
  const db_cex = new sqlite3.Database("./db/cex.sqlite");
  const selectQuery = "SELECT * FROM cex WHERE address=?"; // Your SQL query

  return new Promise((resolve, reject) => {
    db_cex.get(selectQuery, [address], (err, row) => {
      if (err) {
        reject(err);
      } else {
        const isExchange = !!row;
        resolve(isExchange);
      }
    });
  });
};

const sortTransactions = (transactions, walletAddress) => {
  let incoming = [];
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];

    if (tx.from_address != walletAddress) {
      incoming.push(tx);
    }
  }

  incoming.sort((a, b) => parseInt(b.value) - parseInt(a.value));

  return incoming;
};

// TODO: IMPELEMNT This
// const doesItBehaveLikeAnExchange = async (address) => {
//   const isExchange = await isAddressExchange(address);
//   return isExchange;
// };

const hasAddressDeployedERC20V2 = async (transactions) => {
  let contract = { address: "", pair: "" };
  for (let i = 0; i < transactions.length; i++) {
    const element = transactions[i];

    if (element.decoded_call) {
      if (element.decoded_call.label == "addLiquidityETH") {
        console.log(element.decoded_call.params[0].value);
        contract.pair = await getPairAddress(
          element.decoded_call.params[0].value,
          "uniswapv2"
        );
        contract.address = element.decoded_call.params[0].value;
        return contract;
      }
    }
  }

  return undefined;
};

const hasAddressDeployedERC20V3 = async (transactions) => {
  let contract = { address: "", pair: "" };
  for (let i = 0; i < transactions.length; i++) {
    const element = transactions[i];
    // console.log(element);
    if (element.decoded_call) {
      if (element.decoded_call.label == "multicall") {
        for (let j = 0; j < element.logs.length; j++) {
          const log = element.logs[j];
          // if(log.decoded_event && stringStartsWith(log.decoded_event.signature, "AddLiquidity")){
          //   return await getPairAddress(log.decoded_event.params[0].value, "uniswapv3")
          // }
          if (log.decoded_event) {
            if (log.decoded_event.label == "Mint") {
              contract.pair = log.address;
              contract.address = await getContractFromPairForV3(log.address);
              return contract;
            }
          }
        }
      }
    }
  }

  return undefined;
};

const historicSearch = async (address) => {
  response = await fetchTransactionsForWallet(address);
  let v2PairAddress = await hasAddressDeployedERC20V2(response.result);
  let v3PairAddress = await hasAddressDeployedERC20V3(response.result);
  let pairAddress = undefined;
  let contractAddress = undefined;
  if (v2PairAddress) {
    pairAddress = v2PairAddress.pair;
    contractAddress = v2PairAddress.address;
    return await isHistoricRugPull(pairAddress, contractAddress, "v2");
  }
  if (v3PairAddress) {
    console.log(v3PairAddress);
    pairAddress = v3PairAddress.pair;
    contractAddress = v3PairAddress.address;

    return await isHistoricRugPull(pairAddress, contractAddress, "v3");
  }
  return undefined;
};

// module.exports = shallowWalletAudit;
async function writeToFile(output, name = "output") {
  const data = JSON.stringify(output, null, 2);
  console.log(output);
  const fs = require("fs");
  await fs.writeFile(`${name}.json`, data, (err) => {
    if (err) throw err;
    console.log("Data written to file");
  });
}

// HYPO : ONE STEP BACK EXHCAGE NOT AFTER THAT ??
const deepWalletAudit = async (address, depth = 20) => {
  console.log("Address", address);
  let response = await fetchTransactionsForWallet(address);
  let firstInAddress = await findTheFirstInAddress(response.result, address); // Possible this gets fucked by adding a message to  the transaction so need  better analysis
  console.log("Last Address", firstInAddress);
  let isExchange = await isAddressExchange(firstInAddress);
  let isHistoric = await historicSearch(firstInAddress);
  if (isExchange || isHistoric) {
    let wallet_audit = {
      V2RemoveLiq: false,
      V3RemoveLiq: false,
      excessiveMint: false,
      clean: undefined,
      depth: 0,
    };

    return isHistoric ? wallet_audit : wallet_audit;
  }

  for (let i = 0; i < depth; i++) {
    try {
      response = await fetchTransactionsForWallet(firstInAddress);
      let sortedTX = await sortTransactions(response.result, firstInAddress);
      if (!sortedTX[0]) {
        let wallet_audit = {
          V2RemoveLiq: false,
          V3RemoveLiq: false,
          excessiveMint: false,
          clean: undefined,
          depth: i + 1,
        };

        return wallet_audit;
      }
      console.log("NEXT Address", sortedTX[0].from_address);
      isHistoric = await historicSearch(sortedTX[0].from_address);
      isExchange = await isAddressExchange(sortedTX[0].from_address);
      if (isExchange) {
        let wallet_audit = {
          V2RemoveLiq: false,
          V3RemoveLiq: false,
          excessiveMint: false,
          clean: true,
          depth: i + 1,
        };

        return wallet_audit;
      }

      if (isHistoric) {
        isHistoric.depth = i + 1;
        console.log(isHistoric);
        return isHistoric;
      }
      firstInAddress = sortedTX[0].from_address;
      console.log("Last Address", firstInAddress);
    } catch (error) {
      console.log("error", error);
    }
  }

  return undefined;
};

// deepWalletAudit("0xe47b8ac3b07f45e8fb4a1d8a8e535c2cd4940b68", 20).then((res) =>
//   console.log("wrf", res)
// );


// shallowWalletAudit("0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed","0x3c12b77ae8b7dd1feb63d1d6a2a819acda0a41d2").then(data=>console.log(data))
// deepWalletAudit("0x3c12b77ae8b7dd1feb63d1d6a2a819acda0a41d2",100).then(data=>console.log(data))

async function readFromDB_launched() {
  const db = new sqlite3.Database("./db/db_launched.sqlite");
  const sql = `SELECT * FROM tokens`;
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) {
        reject(err);
      }
      resolve(rows);
    });
  });
}



async function findHistoric() {
  const rows = await readFromDB_launched();
  let v2_count = 2449;
  let v3_count = 10;
  let correct_count =  2460;
  let wrong_count =0;
  let total_count =  2573;
  let no_pair = 1683;
  for (let i = 4139; i < rows.length; i++) {
    const element = rows[i];
   let res_v2 =  await getPairAddress(element.tokenAddress,"uniswapv2")
   let res_v3 =  await getPairAddress(element.tokenAddress,"uniswapv3")

   if(res_v2){
    v2_count++;
    let clean = await isHistoricRugPull(res_v2,element.tokenAddress,"v2")
    if(element.clean = clean) correct_count++;
    else wrong_count++;
   }
   else if(res_v3){
    v3_count++;
    let clean = await isHistoricRugPull(res_v3,element.tokenAddress,"v3")
    if(element.clean = clean) correct_count++;
    else wrong_count++;
   }
   else{
    no_pair++;
   }
    console.log(` index : ${i} / total_count :${total_count} / v2: ${v2_count} / v3: ${v3_count} / correct: ${correct_count} / wrong: ${wrong_count} / no_pair: ${no_pair}`);
    total_count--
  }
}



// findHistoric()

isHistoricRugPull("0x5811B4C18EA9a7a9F08821c37c60710059c72321","0x3B1228C3eDe7e0898d57054Cd9B8f812d24315C1","uniswapv2").then((data)=>console.log(data))

// module.exports = {
//   shallowWalletAudit,
//   searchExcisveMint,
//   deepWalletAudit,
//   writeToFile,
// };
