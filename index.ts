import express, { Request, Response } from "express";
import Web3 from "web3";
import Web3Quorum from "web3js-quorum";
// const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
// const Web3 = require("web3");
// const Web3Quorum = require("web3js-quorum");
// const web3 = new Web3Quorum(new Web3.providers.HttpProvider("http://localhost:22000"));
const app = express();
const port = 8080;

app.get("/", (req: Request, res: Response) => {
  web3.eth.getBlockNumber().then((result: any) => {
    console.log(result);
  });
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
