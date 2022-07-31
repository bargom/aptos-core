import { FaucetClient } from "./faucet_client";
import { AptosAccount } from "./aptos_account";
import { AptosClient } from "./aptos_client";
import { TokenClient } from "./token_client";

import { NODE_URL, FAUCET_URL } from "./util.test";

test(
  "full tutorial nft token flow",
  async () => {
    const client = new AptosClient(NODE_URL);
    const faucetClient = new FaucetClient(NODE_URL, FAUCET_URL);
    const tokenClient = new TokenClient(client);

    const alice = new AptosAccount();
    const bob = new AptosAccount();

    // Fund both Alice's and Bob's Account
    await faucetClient.fundAccount(alice.address(), 10000);
    await faucetClient.fundAccount(bob.address(), 5000);

    const collectionName = "AliceCollection";
    const tokenName = "Alice Token";

    // Create collection and token on Alice's account
    await tokenClient.createCollection(alice, collectionName, "Alice's simple collection", "https://aptos.dev");

    await tokenClient.createToken(
      alice,
      collectionName,
      tokenName,
      "Alice's simple token",
      1,
      "https://aptos.dev/img/nyan.jpeg",
      0,
    );

    const tokenId = {
      creator: alice.address().hex(),
      collection: collectionName,
      name: tokenName,
    };

    // Transfer Token from Alice's Account to Bob's Account
    await tokenClient.getCollectionData(alice.address().hex(), collectionName);
    let aliceBalance = await tokenClient.getTokenBalanceForAccount(alice.address().hex(), tokenId);
    expect(aliceBalance.value).toBe("1");
    const tokenData = await tokenClient.getTokenData(alice.address().hex(), collectionName, tokenName);
    expect(tokenData.collection).toBe("AliceCollection");

    await tokenClient.offerToken(alice, bob.address().hex(), alice.address().hex(), collectionName, tokenName, 1);
    aliceBalance = await tokenClient.getTokenBalanceForAccount(alice.address().hex(), tokenId);
    expect(aliceBalance.value).toBe("0");

    await tokenClient.cancelTokenOffer(alice, bob.address().hex(), alice.address().hex(), collectionName, tokenName);
    aliceBalance = await tokenClient.getTokenBalanceForAccount(alice.address().hex(), tokenId);
    expect(aliceBalance.value).toBe("1");

    await tokenClient.offerToken(alice, bob.address().hex(), alice.address().hex(), collectionName, tokenName, 1);
    aliceBalance = await tokenClient.getTokenBalanceForAccount(alice.address().hex(), tokenId);
    expect(aliceBalance.value).toBe("0");

    await tokenClient.claimToken(bob, alice.address().hex(), alice.address().hex(), collectionName, tokenName);

    const bobBalance = await tokenClient.getTokenBalanceForAccount(bob.address().hex(), {
      creator: alice.address().hex(),
      collection: collectionName,
      name: tokenName,
    });
    expect(bobBalance.value).toBe("1");
  },
  30 * 1000,
);
