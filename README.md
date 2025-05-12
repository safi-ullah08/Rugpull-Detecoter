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

# The true positive ran to 15 Million USD (IF ONLY I WASNT JUST F***ING TESTING XD)
This memecoin can be found here https://dexscreener.com/base/0x2075f6E2147d4AC26036C9B4084f8E28b324397d and verified via the db folder sepecifly the db_positions database

The transactions by the bot can be seen here https://dexscreener.com/base/0x2075f6E2147d4AC26036C9B4084f8E28b324397d?maker=0xB1fd45010bCCd32F304A1b707D0B188a2369436e

# How does it work 

I implemented a realtime look up system that reads the data off the nodes and filters the transactions of coin mints specifically 

These are then put into db_launched sqlite database 

which a server is listening to at all times t

They are only three ways to rug a coin you either remove liqudity on Uniswap v2 or on Uniswap v3 and the third way I am calling excessiveMint

