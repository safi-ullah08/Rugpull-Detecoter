# RUGPULL DETECTION BASED TRADING BOT


### This bot has a 99.95% Accuracy of detecting rugpulls on base chain just by looking at a few transactions 

## System Performance

### Confusion Matrix

|                       | Predicted Positive | Predicted Negative | Total  |
|:---------------------:|:------------------:|:------------------:|:------:|
| **Actual Positive**   | 1 (TP)             | 0 (FN)             | 1      |
| **Actual Negative**   | 2 (FP)             | 6,711 (TN)         | 6,713  |
| **Total**             | 3                  | 6,711              | 6,714  |

# The true positive ran to 15 Million USD (IF ONLY I WASNT JUST F***ING TESTING XD)
This memecoin can be found here https://dexscreener.com/base/0x2075f6E2147d4AC26036C9B4084f8E28b324397d and verified via the db folder sepecifly the db_positions database

The transactions by the bot can be seen here https://dexscreener.com/base/0x2075f6E2147d4AC26036C9B4084f8E28b324397d?maker=0xB1fd45010bCCd32F304A1b707D0B188a2369436e

# How does it work 

Realtime Lookup of coin launches

Then for each of the coin launches we run the look back checks for specific patterns

They are then 
