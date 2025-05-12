# RUGPULL DETECTION BASED TRADING BOT


### This bot has a 99.95% Accuracy of detecting rugpulls on base chain just by looking at a few transactions 

### Compared to traditional tools this has perfomed substantially better https://arxiv.org/abs/2403.16082 -> 73% Accuracy 

## System Performance

### Confusion Matrix

|                       | Predicted Positive | Predicted Negative | Total  |
|:---------------------:|:------------------:|:------------------:|:------:|
| **Actual Positive**   | 1 (TP)             | 0 (FN)             | 1      |
| **Actual Negative**   | 2 (FP)             | 6,711 (TN)         | 6,713  |
| **Total**             | 3                  | 6,711              | 6,714  |


### Key Metrics

- **Accuracy**  
  (TP + TN) / Total = (1 + 6,711) / 6,714 ≈ 0.99970 (99.97%)

- **Precision** (Positive Predictive Value)  
  TP / (TP + FP) = 1 / (1 + 2) = 0.3333 (33.33%)

- **Recall** (Sensitivity / True Positive Rate)  
  TP / (TP + FN) = 1 / (1 + 0) = 1.00 (100%)

- **Specificity** (True Negative Rate)  
  TN / (TN + FP) = 6,711 / (6,711 + 2) ≈ 0.99970 (99.97%)

- **F₁ Score**  
  2 × (Precision × Recall) / (Precision + Recall)  
  = 2 × (0.3333 × 1.0) / (0.3333 + 1.0) = 0.50 (50%)

# The true positive ran to 15 Million USD (IF ONLY I WASNT JUST TESTING!!)
This memecoin can be found here https://dexscreener.com/base/0x2075f6E2147d4AC26036C9B4084f8E28b324397d and verified via the db folder sepecifly the db_positions database

The transactions by the bot can be seen here https://dexscreener.com/base/0x2075f6E2147d4AC26036C9B4084f8E28b324397d?maker=0xB1fd45010bCCd32F304A1b707D0B188a2369436e
# ⚙️ How It Works

## Live Blockchain Scanning
I perform real-time lookups directly on the blockchain, capturing token mint transactions on the Uniswap protocol.

## Initial Filters

ERC-20 Compliance: Verify if the token is a valid ERC-20 contract.

Liquidity Check: Confirm whether the token has active liquidity pools on Uniswap (V2 or V3).

## Wallet Audit
Once a token passes the above filters, I run a comprehensive wallet audit on the deployer:

Analyze past transaction patterns.

Detect behaviors indicative of known scammers.

Check for links to prior scams or malicious contracts.

## Database Routing
Based on the audit:

Tokens passing the audit are stored in the clean_launch database.

Tokens with liquidity and passing audits move to the position database (i.e., eligible for tracking or investment).

Tokens flagged during audits remain in the launched database for further analysis.

# 🕵️ Patterns I Detect
1. Self-Destruct Tactics
Scammers may call selfdestruct on their contract after a rug to erase traceable behaviors on explorers, hiding their deployment and activity history.

2. Linked Wallets
Fraudsters obfuscate their behavior through transaction relays:

Wallet A (scam) → Wallet B → Wallet C → ... → Wallet F (scam again)
Despite this nesting, the rugging behavior remains traceable through deeper pattern recognition.

# 💣 How Rug Pulls Happen
There are three core rug pull mechanisms this system is designed to detect:

removeLiquidity() on Uniswap V2

removeLiquidity() on Uniswap V3

Unauthorized Minting:

Custom functions that mint more tokens than the declared supply.

All of these leave an on-chain trace, making them detectable through historical transaction analysis—even if scammers switch chains or addresses.






