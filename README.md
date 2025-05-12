# RUGPULL DETECTION BASED TRADING BOT


### This bot has a 99.95% Accuracy of detecting rugpulls on base chain just by looking at a few transactions 

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

# How does it work 

I implemented a realtime look up system that reads the data off the bloacks and filters the transactions for token mints on the Uniswap protocol

The way I filter it is that I check if the contract is an ERC20 or not and if it is there any liquidity attached to it i.e on Uniswap

Then I do a walletAudit i.e looking for patterns in the transactions that would lead me to beleive that this a rugger who has deployed this contract

All incoming tokens are then stored in the launched db if they clear the audit they move to clean launch if they have liqudity then a transaction takes place and the move into the positon db


# What Pattern do I look for

One of the most interesting one is self desturct where the scammer basicly after depositing the money into a smart contract calls self destruct which if looking on blockchain explorer doesn't allow you to see his previous behaviors

Others including linking where they will basicly nest there transactions say they scam using wallet A then that money goes to wallet B which then goes wallet C and so on unitl it reaches wallet F to scam again 

Regardless of these hiding tactics the one thing that is always constant is the rugging 

There are three ways to rug
1. Call RemoveLiquidity on uniswap V2
2. Call RemoveLiquidity in uniswap V3
3. Or have a function that mints more than the actual supply 

If you want to find a rugger you need to look for these in there tranasction history which makes it extreamly hard for them to avoid dection chain hoping can be one way to do this but that too can be account for in this system





