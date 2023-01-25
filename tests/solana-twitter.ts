import * as anchor from "@project-serum/anchor";
import { Program, ProgramErrorStack } from "@project-serum/anchor";
import { SolanaTwitter } from "../target/types/solana_twitter";
import * as assert from "assert";

describe("solana-twitter", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaTwitter as Program<SolanaTwitter>;

  // FIRST TEST "SEND A TWEET"

  it("can send a new tweet", async () => {
    // Call the "SendTweet" instruction.
    const tweet = anchor.web3.Keypair.generate();
    await program.rpc.sendTweet("MY BRAIN", "ANCHORS GOT MY BRAIN FRIED!", {
      accounts: {
        tweet: tweet.publicKey,
        author: program.provider.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [tweet],
    });

    // Fetch the account details of the created tweet.
    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);
    assert.equal(
      tweetAccount.author.toBase58(),
      program.provider.publicKey.toBase58()
    );
    assert.equal(tweetAccount.topic, "MY BRAIN");
    assert.equal(tweetAccount.content, "ANCHORS GOT MY BRAIN FRIED!");
    assert.ok(tweetAccount.timestamp);
  });

  // SECOND TEST "TWEET W/O A TOPIC!!"

  it("can send a new tweet without a topic", async () => {
    // Call the "SendTweet" instruction.
    const tweet = anchor.web3.Keypair.generate();
    await program.rpc.sendTweet("", "gm", {
      accounts: {
        tweet: tweet.publicKey,
        author: program.provider.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [tweet],
    });

    // Fetch the account details of the created tweet.
    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);

    // Ensure it has the right data.
    assert.equal(
      tweetAccount.author.toBase58(),
      program.provider.publicKey.toBase58()
    );
    assert.equal(tweetAccount.topic, "");
    assert.equal(tweetAccount.content, "gm");
    assert.ok(tweetAccount.timestamp);
  });

  // TEST 3 "SENDING TWEET FROM DIFFERENT AUTHOR!!"

  it("can send a new tweet from a different author", async () => {
    // Generate another user and airdrop them some SOL.
    const otherUser = anchor.web3.Keypair.generate();

    // Call the "SendTweet" instruction on behalf of this other user.
    const tweet = anchor.web3.Keypair.generate();
    const signature = await program.provider.connection.requestAirdrop(
      otherUser.publicKey,
      1000000000
    );
    await program.provider.connection.confirmTransaction(signature);

    await program.rpc.sendTweet("veganism", "Yay Tofu!", {
      accounts: {
        tweet: tweet.publicKey,
        author: otherUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [otherUser, tweet],
    });

    // Fetch the account details of the created tweet.
    const tweetAccount = await program.account.tweet.fetch(tweet.publicKey);

    // Ensure it has the right data.
    assert.equal(
      tweetAccount.author.toBase58(),
      otherUser.publicKey.toBase58()
    );
    assert.equal(tweetAccount.topic, "veganism");
    assert.equal(tweetAccount.content, "Yay Tofu!");
    assert.ok(tweetAccount.timestamp);
  });

  // TEST 4 "CANNOT PROVIDE > 50 CHARS."

  it("cannot provide a topic with more than 50 characters", async () => {
    try {
      const tweet = anchor.web3.Keypair.generate();
      const topicWith51Chars = "x".repeat(51);
      await program.rpc.sendTweet(topicWith51Chars, "Hummus, am I right?", {
        accounts: {
          tweet: tweet.publicKey,
          author: program.provider.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [tweet],
      });
    } catch (error) {
      assert.equal(
        error.msg,
        "The provided topic should be 50 characters long maximum."
      );
      return;
    }

    assert.fail(
      "The instruction should have failed with a 51-character topic."
    );
  });

  // TEST 5 "NO MORE THAN 280 CHARS IN CONTENT"

  it("cannot provide a content with more than 280 characters", async () => {
    try {
      const tweet = anchor.web3.Keypair.generate();
      const contentWith281Chars = "x".repeat(281);
      await program.rpc.sendTweet("veganism", contentWith281Chars, {
        accounts: {
          tweet: tweet.publicKey,
          author: program.provider.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [tweet],
      });
    } catch (error) {
      assert.equal(
        error.msg,
        "The provided content should be 280 characters long maximum."
      );
      return;
    }

    assert.fail(
      "The instruction should have failed with a 281-character content."
    );
  });
});
