const axios = require("axios");
require("dotenv").config();
const fs = require("fs");
const { ERR_PRIVATE_KEY_LENGTH } = require("web3");
const checkDexScrennerForSocails = async (address) => {};

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// pause execution for 300 milliseconds
async function test() {
  console.log("Waiting for 300 milliseconds...");
  await pause(300);
  console.log("Done waiting!");
}
const checkSignatureScam = async (contractAddress) => {
  try {
    const response = await axios.get(
      `https://api.basescan.org/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${process.env.BASESCAN_API_KEY}`,
      {
        headers: { accept: "*/*" },
      }
    );
    const sourceCode = response.data.result[0].SourceCode;

    const hasUint160 = sourceCode.toLowerCase().includes("uint160");
    if (hasUint160) {
      return true;
    }
  } catch (error) {
    console.error("Error fetching contract source code:", error);
    return false;
  }
  return false;
};

const checkApeStoreContract = async (contractAddress) => {
  try {
    const response = await axios.get(
      `https://api.basescan.org/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${process.env.BASESCAN_API_KEY}`,
      {
        headers: { accept: "*/*" },
      }
    );
    const sourceCode = response.data.result[0].SourceCode;
    const hasUint160 = sourceCode.toLowerCase().includes("ape.store");
    if (hasUint160) {
      return true;
    }
  } catch (error) {
    console.error("Error fetching contract source code:", error);
    return false;
  }
  return false;
};

const checkBaseJumpContract = async (contractAddress) => {
  try {
    const response = await axios.get(
      `https://api.basescan.org/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${process.env.BASESCAN_API_KEY}`,
      {
        headers: { accept: "*/*" },
      }
    );
    const sourceCode = response.data.result[0].SourceCode;

    const hasUint160 = sourceCode.toLowerCase().includes("basejump");
    if (hasUint160) {
      return true;
    }
  } catch (error) {
    console.error("Error fetching contract source code:", error);
    return false;
  }
  return false;
};

const fetchContractVerification = async (contractAddress) => {
  if (contractAddress) {
    try {
      const response = await axios.get(
        `https://api.basescan.org/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${process.env.BASESCAN_API_KEY}`,
        {
          headers: { accept: "*/*" },
        }
      );
      return response.data.result[0].SourceCode !== "";
    } catch (error) {
      console.error("Error fetching contract source code:", error);
      return false;
    }
  }
  return false;
};

const quickInstelSecurity = async (contractAddress) => {
  try {
    const response = await axios.post(
      "https://api.quickintel.io/v1/getquickiaudit",
      {
        chain: "base",
        tokenAddress: contractAddress,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "X-QKNTL-KEY": "b2fe83fa811c464bb12d570b118fac11",
        },
      },
      { timeout: 500 }
    );
    return response.data;
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      console.log("Request timed out");
    } else {
      console.log(error);
    }
    return error;
  }
};

const checkQuickIntelSecurity = async (contractAddress) => {
  try {
    const quickIntel = await quickInstelSecurity(contractAddress);
    let quickAduit = quickIntel.quickiAudit;
    let audit =
      quickAduit.contract_Renounced &&
      !quickAduit.is_Launchpad_Contract &&
      !quickAduit.hidden_Owner &&
      !quickAduit.is_Proxy &&
      !quickAduit.has_External_Contract_Risk &&
      !quickAduit.has_Obfuscated_Address_Risk &&
      !quickAduit.can_Mint &&
      !quickAduit.can_Blacklist &&
      !quickAduit.can_Whitelist &&
      !quickAduit.can_Update_Fees &&
      !quickAduit.can_Update_Max_Wallet;
    !quickAduit.can_Update_Max_Tx &&
      !quickAduit.can_Pause_Trading &&
      !quickAduit.has_Trading_Cooldown &&
      !quickAduit.can_Update_Wallets &&
      !quickAduit.has_Suspicious_Functions &&
      !quickAduit.has_External_Functions &&
      !quickAduit.has_ModifiedTransfer_Warning &&
      !quickAduit.has_Scams;

    return !audit;
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      console.log("Request timed out");
    } else {
      console.log(error);
    }
    return undefined;
  }
};

async function isHoneypot(contractAddress) {
  try {
    const response = await axios.get("https://api.honeypot.is/v2/IsHoneypot", {
      params: {
        address: contractAddress,
      },
    });
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function checkHoneypot(contractAddress) {
  let data = await isHoneypot(contractAddress);
  return data.honeypotResult.isHoneypot;
}

async function securityAudit(contractAddress, walletClean) {
  try {
    let ver = await fetchContractVerification(contractAddress);
    let sig = await checkSignatureScam(contractAddress);
    audit = {
      contractVerified: ver,
      signatureScam: sig,
      quickIntel:
        walletClean && ver && !sig
          ? await checkQuickIntelSecurity(contractAddress)
          : undefined,
      basejump: await checkBaseJumpContract(contractAddress),
      apestore: await checkApeStoreContract(contractAddress),
      clean: false,
    };

    audit.clean =
      audit.contractVerified &&
      !audit.signatureScam &&
      audit.quickIntel ? audit.quickIntel : false &&
      !audit.basejump &&
      !audit.apestore;

    return audit;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}



module.exports = {
  securityAudit,
};
