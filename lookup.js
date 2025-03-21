const { Web3 } = require("web3");
const sqlite3 = require("sqlite3").verbose();
const ERC20ABI = require("./abis/ERC20.js");
const V3PairABI = require("./abis/V3PairABI.js");
const V2PairABI = require("./abis/V2PairABI.js");
const { securityAudit } = require("./securityChecks.js");
const {
  shallowWalletAudit,
  deepWalletAudit,
  searchExcisveMint,
  writeToFile,
} = require("./creatorWalletAnalysis.js");

// Connect to the Ethereum network via Infura
const web3 = new Web3(
  new Web3.providers.WebsocketProvider(
    `wss://base-mainnet.g.alchemy.com/v2/${process.env.WSS_ALCHEMY_API_KEY}`
  )
);

const db = new sqlite3.Database("./db/db_launched.sqlite");
const db_clean = new sqlite3.Database("./db/db_clean_launched.sqlite");

const axios = require("axios");

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

async function isRugPull(contractAddress) {
  if (await searchExcisveMint(contractAddress)) {
    return true;
  }
  if (await searchV2(contractAddress)) {
    return true;
  }
  if (await searchV3(contractAddress)) {
    return true;
  }

  return false;
}

async function isERC20(contractAddress) {
  const contract = new web3.eth.Contract(ERC20ABI, contractAddress);

  try {
    const name = await contract.methods.name().call();
    const symbol = await contract.methods.symbol().call();

    console.log(`Name: ${name}, Symbol:${symbol}`);
    return { name, symbol }; // The contract is likely ERC-20 compliant
  } catch (error) {
    console.error("Contract does not appear to be ERC-20 compliant:");
    return undefined; // The contract is not ERC-20 compliant
  }
}

const historicLookup = async (from = 16256879, to = 16331189) => {
  console.log("historicLookup");
  for (let index = from; index <= to; index++) {
    console.log(`At BlockNo: ${index} Left: ${to - index}`);
    const block = await web3.eth.getBlock(index, true);
    if (block && block.transactions) {
      block.transactions.forEach(async (tx) => {
        // Check if 'to' field is null, indicating a contract creation
        if (tx.to === null) {
          console.log(`New contract deployed at transaction hash: ${tx.hash}`);
          // Optionally, get the contract address from the transaction receipt
          const recipt = await web3.eth.getTransactionReceipt(tx.hash);
          let data = await isERC20(recipt.contractAddress);
          if (data) {
            data.tokenAddress = recipt.contractAddress;
            data.url = `https://dexscreener.com/base/${data.tokenAddress}`;
            data.timestamp = new Date().getTime();
            data.deployer = tx.from;
            data.baseurl = `https://basescan.org/address/${tx.from}`;
            console.log(data);
            await insertDataToDB(data);
          }
        }
      });
    }
  }
};

const realTimeLookup = async () => {
  const newBlocksSubscription = await web3.eth.subscribe("newBlockHeaders");

  newBlocksSubscription.on("data", async (blockhead) => {
    console.log("New block header: ", blockhead.number);
    const block = await web3.eth.getBlock(blockhead.number, true);
    if (block && block.transactions) {
      block.transactions.forEach(async (tx) => {
        // Check if 'to' field is null, indicating a contract creation
        if (tx.to === null) {
          console.log(`New contract deployed at transaction hash: ${tx.hash}`);
          // Optionally, get the contract address from the transaction receipt
          const recipt = await web3.eth.getTransactionReceipt(tx.hash);
          let data = await isERC20(recipt.contractAddress);
          if (data) {
            data.tokenAddress = recipt.contractAddress;
            data.timestamp = new Date().getTime();
            data.deployer = tx.from;
            console.log(data);
            walletAuditTest(data);
          }
        }
      });
    }
  });
  newBlocksSubscription.on("error", (error) =>
   
  realTimeLookup()
  );
};

async function insertDataToDB(data) {
  db.run(`CREATE TABLE IF NOT EXISTS tokens (
    name TEXT,
    symbol TEXT,
    tokenAddress TEXT UNIQUE,
    url TEXT,
    deployer TEXT ,
    baseurl TEXT,
    timestamp INTEGER,
    naiveV2RemoveLiq BOOLEAN,
    naiveV3RemoveLiq BOOLEAN,
    shallowRemoveLiq BOOLEAN,
    naiveSelfDestruct BOOLEAN,
    shallowSelfDestruct BOOLEAN,
    contractVerifed BOOLEAN,
    signatureScam BOOLEAN,
    deepV2 BOOLEAN,
    deepV3 BOOLEAN,
    deepMint BOOLEAN,
    depth INTEGER,
    quikIntel BOOLEAN,
    basejump BOOLEAN,
    apestore BOOLEAN,
    clean BOOLEAN

  )`);

  db_clean.run(`CREATE TABLE IF NOT EXISTS tokens (
    name TEXT,
    symbol TEXT,
    tokenAddress TEXT UNIQUE,
    url TEXT,
    deployer TEXT ,
    baseurl TEXT,
    timestamp INTEGER,
    postion BOOLEAN
  )`);

  const insertSql = `INSERT INTO tokens (name, symbol, tokenAddress, url, deployer, baseurl, timestamp, naiveV2RemoveLiq, naiveV3RemoveLiq, shallowRemoveLiq, naiveSelfDestruct, shallowSelfDestruct, contractVerifed, signatureScam, deepV2, deepV3,deepMint,depth ,quikIntel, clean,basejump,apestore) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?,?,?,?)`;

  const insertCleanSql = `INSERT INTO tokens (name, symbol, tokenAddress, url, deployer,baseurl,timestamp,postion) VALUES (?, ?, ?, ?, ?,?,?,?)`;
  if (data.clean) {
    db_clean.run(
      insertCleanSql,
      [
        data.name,
        data.symbol,
        data.tokenAddress,
        data.url,
        data.deployer,
        data.baseurl,
        data.timestamp,
        false,
      ],
      (err) => {
        if (err) {
          console.error("Error inserting data into SQLite:", err);
        }
      }
    );
  }
  db.run(
    insertSql,
    [
      data.name,
      data.symbol,
      data.tokenAddress,
      data.url,
      data.deployer,
      data.baseurl,
      data.timestamp,
      data.naiveV2RemoveLiq,
      data.naiveV3RemoveLiq,
      data.shallowRemoveLiq,
      data.naiveSelfDestruct,
      data.shallowSelfDestruct,
      data.contractVerifed,
      data.signatureScam,
      data.deepV2,
      data.deepV3,
      data.deepMint,
      data.depth,
      data.quikIntel,
      data.basejump,
      data.apestore,
      data.clean,
    ],
    (err) => {
      if (err) {
        console.error("Error inserting data into SQLite:", err);
      }
    }
  );
}

async function walletAuditTest(token_data) {
  let wallet_audit = await shallowWalletAudit(
    token_data.tokenAddress,
    token_data.deployer
  );
  let audit = await securityAudit(token_data.tokenAddress, wallet_audit.clean);
  console.log(wallet_audit);
  console.log(audit);

  let deep_audit ;
  if (wallet_audit.clean && audit.clean) {
    deep_audit = await deepWalletAudit(token_data.deployer, 20);
  }

  let data = {
    name: token_data.name,
    symbol: token_data.symbol,
    tokenAddress: token_data.tokenAddress,
    url: `https://dexscreener.com/base/${token_data.tokenAddress}`,
    baseurl: token_data.baseurl,
    deployer: token_data.deployer,
    naiveV2RemoveLiq: wallet_audit.naiveV2RemoveLiq,
    naiveV3RemoveLiq: wallet_audit.naiveV3RemoveLiq,
    shallowRemoveLiq: wallet_audit.shallowRemoveLiq,
    naiveSelfDestruct: wallet_audit.naiveSelfDestruct,
    shallowSelfDestruct: wallet_audit.shallowSelfDestruct,
    contractVerifed: audit.contractVerified,
    signatureScam: audit.signatureScam,
    quikIntel: audit.quickIntel,
    deepV2: deep_audit ? deep_audit.V2RemoveLiq : undefined,
    deepV3: deep_audit ? deep_audit.V3RemoveLiq : undefined,
    deepMint: deep_audit ? deep_audit.excessiveMint : undefined,
    depth: deep_audit ? deep_audit.depth : undefined,
    clean:
      wallet_audit.clean &&
      audit.clean &&
      (deep_audit ? (deep_audit.clean ? true : false) : false),
    timestamp: token_data.timestamp,
    basejump: audit.basejump,
    apestore: audit.apestore,
  };
  await insertDataToDB(data);
  console.log("dOne");
}

async function searchV2(contractAddress) {
  const contract = new web3.eth.Contract(V2PairABI, contractAddress);
  const res = await contract.methods.getReserves().call();
  if (res._reserve0 < 500) {
    return true;
  }
  return false;
}

async function searchV3(contractAddress) {
  const contract = new web3.eth.Contract(V3PairABI, contractAddress);
  const liq = await contract.methods.liquidity().call();
  if (liq > 0) {
    return false;
  }
  return true;
}

async function testDataLabeling(contractAddress) {
  let rug = {
    isRug: false,
    kindOfRug: null,
  };
  let pairV2Address = await getPairAddress(contractAddress, "uniswapv2");
  let pairV3Address = await getPairAddress(contractAddress, "uniswapv3");
  if (pairV2Address) {
    if (await searchExcisveMint(contractAddress)) {
      // lable as Rug and ExcsiveMint
      rug.isRug = true;
      rug.kindOfRug = "ExcsiveMint";
      console.log(rug);
      return rug;
    }
    if (await searchV2(pairV2Address)) {
      rug.isRug = true;
      rug.kindOfRug = "V2";
      console.log(rug);
      return rug;
    }
  } else if (pairV3Address) {
    //skip

    if (await searchExcisveMint(contractAddress)) {
      // lable as Rug and ExcsiveMint
      rug.isRug = true;
      rug.kindOfRug = "ExcsiveMint";
      console.log(rug);
      return rug;
    }

    if (await searchV3(pairV3Address)) {
      rug.isRug = true;
      rug.kindOfRug = "V3";
      console.log(rug);

      return rug;
    }

    return rug;
  } else {
    return undefined;
  }
}

async function testData() {
  let token_data = [
    {
      contractAddress: "0x2075f6E2147d4AC26036C9B4084f8E28b324397d",
      deployerAddress: "0x01733ccddc0e7d4048dca364662347d1ff6d5cd0",
    },
    // {
    //   contractAddress: "0xd950fC110167c92AF9c9da5eD6ed5E49c03506A1",
    //   deployerAddress: "0xaa1FBBC15b559913fBFb6A3A461521a8140a204d",
    // },
    // {
    //   contractAddress: "0xF86FF71d6CDF6c8dFA0E75B1fc6Ce2254fA8BE60",
    //   deployerAddress: "0x6f5d06e149c005a56a62469ab872be35dafb02a3",
    // },
    // {
    //   contractAddress: "0xF86FF71d6CDF6c8dFA0E75B1fc6Ce2254fA8BE60",
    //   deployerAddress: "0x7ddf26F28E6271bE90A699e4dd26406d09852c01",
    // },
    // {
    //   contractAddress: "0x55c9da5AA8607f98c8ae440022B89F5d4aAea18D",
    //   deployerAddress: "0xbbe049fa1da80ba114d3fc1252112b3869970e9c",
    // },
    // {
    //   contractAddress: "0xA83b35f61aBD8698eE2b4480Dd391a44c37F91b3",
    //   deployerAddress: "0xe77da646f9095533c70cab78d9bbe1c678336a8d",
    // },
    // {
    //   contractAddress: "0xbE5c6A2a5ad5818212Db1bC99E6e578e896fD260",
    //   deployerAddress: "0xf1c222a644d7c360dbc121b5d0c79879520c9362",
    // },
    // {
    //   contractAddress: "0xA202B2b7B4D2fe56BF81492FFDDA657FE512De07",
    //   deployerAddress: "0x551d653df66a0a6dc609f167b6e2c8fb0850d5ef",
    // },
    // {
    //   contractAddress: "0xCe8946839530bdd3b7d8C387fb3B52A89c70FE6B",
    //   deployerAddress: "0x7866da7971ec9ba4c9aa643849a32216ed0ccc58",
    // },
    // {
    //   contractAddress: "0x279cDA46a368fcC9DC0eC5C7c5c1Bc5Bb1D78938",
    //   deployerAddress: "0x5451f799177a6dcd98a4f17ec7ce69a1d478392a",
    // },
  ];
  for (let index = 0; index < token_data.length; index++) {
    const token = token_data[index];
    let data = await isERC20(token.contractAddress);
    if (data) {
      data.tokenAddress = token.contractAddress;
      data.url = `https://dexscreener.com/base/${token.contractAddress}`;
      data.timestamp = new Date().getTime();
      data.deployer = token.deployerAddress;
      data.baseurl = `https://basescan.org/address/${token.deployerAddress}`;
      console.log(data);
      await walletAuditTest(data);
    }
  }
}







// deepWalletAudit("0x25d7766530d95e0dc6d882ec8377521a3f87ebc2",20).then(res=>console.log(res))

// testData();

realTimeLookup()


