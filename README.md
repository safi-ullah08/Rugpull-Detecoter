# Rugpull Detecoter

Detects rugpulls on Base chain with ~99% accuracy by inspecting transaction patterns and smart contract behavior.

---

## 🧾 Features

- Real-time blockchain scanning to catch suspicious token deployments  
- ERC-20 compliance & liquidity checks  
- Wallet auditing & behavioral analysis  
- Pattern detection for rugpull tactics: liquidity removal, unauthorized minting, linked wallets, self-destruct  
- Database routing: classifies tokens into clean, launched, or flagged  

---

## 📂 Project Structure

Rugpull-Detecoter/  
&nbsp;&nbsp;&nbsp;&nbsp;.vscode/  
&nbsp;&nbsp;&nbsp;&nbsp;abis/  
&nbsp;&nbsp;&nbsp;&nbsp;db/  
&nbsp;&nbsp;&nbsp;&nbsp;creatorWalletAnalysis.js  
&nbsp;&nbsp;&nbsp;&nbsp;example.env  
&nbsp;&nbsp;&nbsp;&nbsp;lookup.js  
&nbsp;&nbsp;&nbsp;&nbsp;moniterPositions.js  
&nbsp;&nbsp;&nbsp;&nbsp;moniterTrade.js  
&nbsp;&nbsp;&nbsp;&nbsp;out.sql  
&nbsp;&nbsp;&nbsp;&nbsp;package.json  
&nbsp;&nbsp;&nbsp;&nbsp;package-lock.json  
&nbsp;&nbsp;&nbsp;&nbsp;securityChecks.js  
&nbsp;&nbsp;&nbsp;&nbsp;trade.js  
&nbsp;&nbsp;&nbsp;&nbsp;README.md  


---

## 📈 System Performance

**Confusion Matrix**

|               | Predicted Positive | Predicted Negative | Total |
|---------------|---------------------|---------------------|-------|
| Actual Positive | 1                 | 0                   | 1     |
| Actual Negative | 2                 | 6,711               | 6,713 |
| **Total**       | 3                 | 6,711               | 6,714 |

### Key Metrics

- Accuracy: (TP + TN) / Total ≈ 0.99970 (99.97%)  
- Precision: TP / (TP + FP) = 1 / (1 + 2) = 0.3333 (33.33%)  
- Recall: TP / (TP + FN) = 1 / (1 + 0) = 1.00 (100%)  
- F₁ Score = 0.50  

> The true positive corresponded to a ~\$15 million token rugpull (this was a test case).  

---

## ⚙️ How It Works

### Live Blockchain Scanning  
Tracks token mint events on Uniswap protocol on Base chain.

### Initial Filters  
- Ensures tokens are valid ERC-20  
- Verifies if liquidity exists in Uniswap pools  

### Wallet Audit  
Runs behavioral and historical analyses on deployer wallets to detect known scam patterns, including relayed transactions across multiple addresses.

### Database Routing  
- **clean_launch**: passes all filters  
- **position**: tokens with liquidity & safe audits  
- **launched**: flagged or suspicious tokens  

### Rugpull Tactics Detected  
1. `removeLiquidity()` on Uniswap V2 & V3  
2. Unauthorized minting beyond declared supply  
3. Self-destruct calls to erase contract trace  
4. Linked wallet relays used to obfuscate flows  

---

## ✅ Usage / Setup

1. Set up `.env` (see `example.env`) with correct RPC endpoints, DB credentials, etc.  
2. Run necessary migrations or load `out.sql` into your database.  
3. Use scripts like `lookup.js`, `moniterTrade.js`, `moniterPositions.js` to scan or analyze tokens.  
4. Incorporate `securityChecks.js` for validating suspicious behavior.  
5. Use `trade.js` for trade simulations / monitoring.

---

## 🔒 Limitations & Notes

- Precision is low (many false positives) despite very high accuracy  
- Detection is based on heuristics and on-chain patterns — not foolproof  
- Requires access to database & full blockchain data  
- Performance & resource consumption depend on scan rate and DB optimizations  

---

## 📜 License

MIT  

---

## 🙌 Acknowledgements

Project by [@safi-ullah08](https://github.com/safi-ullah08)  
Inspired by academic & open-source approaches in on-chain fraud detection  
If you find this helpful, feel free to ⭐ the repo or open issues/PRs!  

