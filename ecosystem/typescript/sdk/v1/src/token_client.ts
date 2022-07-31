import { AptosAccount } from "./aptos_account";
import { AptosClient } from "./aptos_client";
import * as TokenTypes from "./token_types";
import * as lodash from "lodash";
import * as Gen from "./generated/index";
import { HexString, MaybeHexString } from "./hex_string";
import { moveStructTagToParam } from "./util";

/**
 * Class for creating, minting and managing minting NFT collections and tokens
 */
export class TokenClient {
  aptosClient: AptosClient;

  /**
   * Creates new TokenClient instance
   * @param aptosClient AptosClient instance
   */
  constructor(aptosClient: AptosClient) {
    this.aptosClient = aptosClient;
  }

  /**
   * Brings together methods for generating, signing and submitting transaction
   * @param account AptosAccount which will sign a transaction
   * @param payload Transaction payload. It depends on transaction type you want to send
   * @returns Promise that resolves to transaction hash
   */
  async submitTransactionHelper(account: AptosAccount, payload: Gen.TransactionPayload) {
    const txnRequest = await this.aptosClient.helpers.generateTransaction(account.address(), payload, {
      max_gas_amount: "4000",
    });
    const signedTxn = await this.aptosClient.helpers.signTransaction(account, txnRequest);
    const res = await this.aptosClient.transactions.submitTransaction(signedTxn);
    await this.aptosClient.helpers.waitForTransaction(res.hash);
    return Promise.resolve(res.hash);
  }

  /**
   * Creates a new NFT collection within the specified account
   * @param account AptosAccount where collection will be created
   * @param name Collection name
   * @param description Collection description
   * @param uri URL to additional info about collection
   * @returns A hash of transaction
   */
  async createCollection(account: AptosAccount, name: string, description: string, uri: string): Promise<string> {
    const payload: Gen.TransactionPayload = {
      type: "script_function_payload",
      function: {
        module: {
          address: "0x1",
          name: "token",
        },
        name: "create_unlimited_collection_script",
      },
      type_arguments: [],
      arguments: [
        Buffer.from(name).toString("hex"),
        Buffer.from(description).toString("hex"),
        Buffer.from(uri).toString("hex"),
      ],
    };
    const transactionHash = await this.submitTransactionHelper(account, payload);
    return transactionHash;
  }

  /**
   * Creates a new NFT within the specified account
   * @param account AptosAccount where token will be created
   * @param collectionName Name of collection, that token belongs to
   * @param name Token name
   * @param description Token description
   * @param supply Token supply
   * @param uri URL to additional info about token
   * @param royalty_points_per_million the royal points to be provided to creator
   * @returns A hash of transaction
   */
  async createToken(
    account: AptosAccount,
    collectionName: string,
    name: string,
    description: string,
    supply: number,
    uri: string,
    royalty_points_per_million: number,
  ): Promise<string> {
    const payload: Gen.TransactionPayload = {
      type: "script_function_payload",
      function: {
        module: {
          address: "0x1",
          name: "token",
        },
        name: "create_unlimited_token_script",
      },
      type_arguments: [],
      arguments: [
        Buffer.from(collectionName).toString("hex"),
        Buffer.from(name).toString("hex"),
        Buffer.from(description).toString("hex"),
        true,
        supply.toString(),
        Buffer.from(uri).toString("hex"),
        royalty_points_per_million.toString(),
      ],
    };
    const transactionHash = await this.submitTransactionHelper(account, payload);
    return transactionHash;
  }

  /**
   * Transfers specified amount of tokens from account to receiver
   * @param account AptosAccount where token from which tokens will be transfered
   * @param receiver  Hex-encoded 32 byte Aptos account address to which tokens will be transfered
   * @param creator Hex-encoded 32 byte Aptos account address to which created tokens
   * @param collectionName Name of collection where token is stored
   * @param name Token name
   * @param amount Amount of tokens which will be transfered
   * @returns A hash of transaction
   */
  async offerToken(
    account: AptosAccount,
    receiver: MaybeHexString,
    creator: MaybeHexString,
    collectionName: string,
    name: string,
    amount: number,
  ): Promise<string> {
    const payload: Gen.TransactionPayload = {
      type: "script_function_payload",
      function: {
        module: {
          address: "0x1",
          name: "token_transfers",
        },
        name: "offer_script",
      },
      type_arguments: [],
      arguments: [
        receiver,
        creator,
        Buffer.from(collectionName).toString("hex"),
        Buffer.from(name).toString("hex"),
        amount.toString(),
      ],
    };
    const transactionHash = await this.submitTransactionHelper(account, payload);
    return transactionHash;
  }

  /**
   * Claims a token on specified account
   * @param account AptosAccount which will claim token
   * @param sender Hex-encoded 32 byte Aptos account address which holds a token
   * @param creator Hex-encoded 32 byte Aptos account address which created a token
   * @param collectionName Name of collection where token is stored
   * @param name Token name
   * @returns A hash of transaction
   */
  async claimToken(
    account: AptosAccount,
    sender: MaybeHexString,
    creator: MaybeHexString,
    collectionName: string,
    name: string,
  ): Promise<string> {
    const payload: Gen.TransactionPayload = {
      type: "script_function_payload",
      function: {
        module: {
          address: "0x1",
          name: "token_transfers",
        },
        name: "claim_script",
      },
      type_arguments: [],
      arguments: [sender, creator, Buffer.from(collectionName).toString("hex"), Buffer.from(name).toString("hex")],
    };
    const transactionHash = await this.submitTransactionHelper(account, payload);
    return transactionHash;
  }

  /**
   * Removes a token from pending claims list
   * @param account AptosAccount which will remove token from pending list
   * @param receiver Hex-encoded 32 byte Aptos account address which had to claim token
   * @param creator Hex-encoded 32 byte Aptos account address which created a token
   * @param collectionName Name of collection where token is strored
   * @param name Token name
   * @returns A hash of transaction
   */
  async cancelTokenOffer(
    account: AptosAccount,
    receiver: MaybeHexString,
    creator: MaybeHexString,
    collectionName: string,
    name: string,
  ): Promise<string> {
    const payload: Gen.TransactionPayload = {
      type: "script_function_payload",
      function: {
        module: {
          address: "0x1",
          name: "token_transfers",
        },
        name: "cancel_offer_script",
      },
      type_arguments: [],
      arguments: [receiver, creator, Buffer.from(collectionName).toString("hex"), Buffer.from(name).toString("hex")],
    };
    const transactionHash = await this.submitTransactionHelper(account, payload);
    return transactionHash;
  }

  /**
   * Queries collection data
   * @param creator Hex-encoded 32 byte Aptos account address which created a collection
   * @param collectionName Collection name
   * @returns Collection data in below format
   * ```
   *  Collection {
   *    // Describes the collection
   *    description: string,
   *    // Unique name within this creators account for this collection
   *    name: string,
   *    // URL for additional information/media
   *    uri: string,
   *    // Total number of distinct Tokens tracked by the collection
   *    count: number,
   *    // Optional maximum number of tokens allowed within this collections
   *    maximum: number
   *  }
   * ```
   */
  async getCollectionData(creator: MaybeHexString, collectionName: string): Promise<any> {
    const resources = await this.aptosClient.accounts.getAccountResources(creator.toString());
    const accountResource: { type: Gen.MoveStructTag; data: any } = resources.find((r) =>
      lodash.isEqual(r.type, {
        address: "0x1",
        module: "token",
        name: "Collections",
        generic_type_params: [],
      }),
    )!;
    const { handle }: { handle: string } = accountResource.data.collections;
    const getCollectionTableItemRequest: Gen.TableItemRequest = {
      key_type: "0x1::string::String",
      value_type: "0x1::token::Collection",
      key: collectionName,
    };
    // eslint-disable-next-line no-unused-vars
    const collectionTable = await this.aptosClient.tables.getTableItem(handle, getCollectionTableItemRequest);
    return collectionTable;
  }

  /**
   * Queries token data from collection
   * @param creator Hex-encoded 32 byte Aptos account address which created a token
   * @param collectionName Name of collection, which holds a token
   * @param tokenName Token name
   * @returns Token data in below format
   * ```
   * TokenData {
   *     // Unique name within this creators account for this Token's collection
   *     collection: string;
   *     // Describes this Token
   *     description: string;
   *     // The name of this Token
   *     name: string;
   *     // Optional maximum number of this type of Token.
   *     maximum: number;
   *     // Total number of this type of Token
   *     supply: number;
   *     /// URL for additional information / media
   *     uri: string;
   *   }
   * ```
   */
  async getTokenData(
    creator: MaybeHexString,
    collectionName: string,
    tokenName: string,
  ): Promise<TokenTypes.TokenData> {
    let resourceType = moveStructTagToParam({
      address: "0x1",
      module: "token",
      name: "Collections",
      generic_type_params: [],
    });
    const collection: { type: Gen.MoveStructTag; data: any } = await this.aptosClient.accounts.getAccountResource(
      creator.toString(),
      resourceType,
    );
    const { handle } = collection.data.token_data;
    const tokenId = {
      creator,
      collection: collectionName,
      name: tokenName,
    };

    const getTokenTableItemRequest: Gen.TableItemRequest = {
      key_type: "0x1::token::TokenId",
      value_type: "0x1::token::TokenData",
      key: tokenId,
    };

    // We know the response will be MoveValue, specifically the struct variant.
    // We cast that struct to an instance of TokenData.
    return (await this.aptosClient.tables.getTableItem(handle, getTokenTableItemRequest)) as TokenTypes.TokenData;
  }

  /**
   * TODO: What does this mean? Is it more like getTokenBalanceInAccount?
   * Queries token balance for a token account
   * @param account Hex-encoded 32 byte Aptos account address which created a token
   * @param tokenId token id
   *
   * @example
   * ```
   * {
   *   creator: '0x1',
   *   collection: 'Some collection',
   *   name: 'Awesome token'
   * }
   * ```
   * @returns Token object in below format
   * ```
   * Token {
   *   id: TokenId;
   *   value: number;
   * }
   * ```
   */
  async getTokenBalanceForAccount(account: MaybeHexString, tokenId: TokenTypes.TokenId): Promise<TokenTypes.Token> {
    let resourceType = moveStructTagToParam({
      address: "0x1",
      module: "token",
      name: "TokenStore",
      generic_type_params: [],
    });
    const tokenStore: { type: Gen.MoveStructTag; data: any } = await this.aptosClient.accounts.getAccountResource(
      account.toString(),
      resourceType,
    );
    const { handle } = tokenStore.data.tokens;

    const getTokenTableItemRequest: Gen.TableItemRequest = {
      key_type: "0x1::token::TokenId",
      value_type: "0x1::token::Token",
      key: tokenId,
    };

    return (await this.aptosClient.tables.getTableItem(handle, getTokenTableItemRequest)) as TokenTypes.Token;
  }
}
