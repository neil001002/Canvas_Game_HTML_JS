const $ = document.getElementById.bind(document);
const nimiq = {};
const recipientUser1 = "NQ37 K3MV DM1N RHE5 48L9 4AP7 JCME 8VFU D59F";
const amountUser1 = 1;

function status(text) {
  $("message").textContent = text;
}

function onConsensusChanged(consensus) {
  status(
    consensus == Nimiq.Client.ConsensusState.ESTABLISHED
      ? "Consensus established."
      : "Establishing consensus..."
  );
}

async function onHeadChanged() {
  const height = await nimiq.client.getHeadHeight();
  $("height").textContent = height;

  const { totalPeerCount, bytesReceived, bytesSent } =
    await nimiq.network.getStatistics();
  $("network").textContent = `${totalPeerCount} peers connected,
                 ${bytesSent} bytes sent,
                 ${bytesReceived} received.`;

  console.log(
    `Now at height ${height} with ${totalPeerCount} peers and ${bytesSent}/${bytesReceived} bytes sent/received.`
  );

  //update the balance each time a new block gets mined
  const account = await nimiq.client.getAccount(nimiq.wallet.address);
  const balance = Nimiq.Policy.lunasToCoins(account.balance);
  $("balance").textContent = `${balance.toFixed(2)} NIM`; // Limit to two decimals

  // Another send function for auto transaction
  async function sendTransaction(recipientUser1, amountUser1) {
    const transaction = nimiq.wallet.createTransaction(
      Nimiq.Address.fromUserFriendlyAddress(recipientUser1),
      Nimiq.Policy.coinsToLunas(amountUser1), // Here we convert from NIM to luna
      0, // Fee, which is not required in the testnet
      await nimiq.client.getHeadHeight() // Blockchain height from when the transaction should be valid (we set the current height)
    );

    // Send to the Nimiq network
    nimiq.client.sendTransaction(transaction);
    console.log(transaction, `1 NIM sent to ${recipientUser1}`);
  }

  //Calling sendTransaction fn for auto transaction
  // We define this function in the next step
  sendTransaction(recipientUser1, amountUser1);
}

//The Pico Client can monitor the network for incoming transactions
function onTransaction(txDetails) {
  if (txDetails.recipient.equals(nimiq.wallet.address)) {
    status(
      `Incoming transaction of ${Nimiq.Policy.lunasToCoins(tx.value)} NIM!`
    );
  }

  //To show some feedback while the transaction is going out
  if (txDetails.sender.equals(nimiq.wallet.address)) {
    switch (txDetails.state) {
      case Nimiq.Client.TransactionState.PENDING:
        status("Transaction is in the network...");
        break;
      case Nimiq.Client.TransactionState.MINED:
        // Transaction has been confirmed once
        status("Transaction mined, looking good...");
        break;
      case Nimiq.Client.TransactionState.CONFIRMED:
        // Requires 10 confirmations by default (can be configured when creating the client)
        status("Transaction confirmed for good. :)");
        break;
    }
  }
}

//send transaction after send button being clicked
async function sendTransaction(address, amount, message) {
  // helper function to create the basic transaction
  async function basicTransaction() {
    return nimiq.wallet.createTransaction(
      Nimiq.Address.fromUserFriendlyAddress(address),
      Nimiq.Policy.coinsToLunas(amount),
      0, // fee
      await nimiq.client.getHeadHeight()
    );
  }

  // create an extended transaction that will carry the message as "extraData"
  async function extendedTransaction() {
    // turn string into a safely encoded array of bytes
    const extraData = Nimiq.BufferUtils.fromUtf8(message);

    const transaction = new Nimiq.ExtendedTransaction(
      nimiq.wallet.address, // sender address
      Nimiq.Account.Type.BASIC, // and account type
      Nimiq.Address.fromUserFriendlyAddress(address), // recipient address
      Nimiq.Account.Type.BASIC, // and type
      Nimiq.Policy.coinsToLunas(amount),
      0, // fee
      await nimiq.client.getHeadHeight(),
      Nimiq.Transaction.Flag.NONE,
      extraData // the message
    );

    // sign transaction with the key pair from our wallet
    const keyPair = nimiq.wallet.keyPair;
    const signature = Nimiq.Signature.create(
      keyPair.privateKey,
      keyPair.publicKey,
      transaction.serializeContent()
    );
    const proof = Nimiq.SignatureProof.singleSig(keyPair.publicKey, signature);
    transaction.proof = proof.serialize(); // Set the proof with the signature on the transaction

    return transaction;
  }

  // create an extended transaction if a message is set, otherwise a basic transaction
  const transaction =
    message.trim().length > 0
      ? await extendedTransaction()
      : await basicTransaction();

  // Send to the Nimiq network
  nimiq.client.sendTransaction(transaction);
}

async function start() {
  status("Nimiq loaded. Establishing consensus...");

  // Config to use Nimiq Testnet - change to 'main()' for Mainnet.
  Nimiq.GenesisConfig.test();

  // the config builder will create the minimal necessary client for you.
  const configBuilder = Nimiq.Client.Configuration.builder();

  // By not requesting any addition features, a Nimiq Pico Client instance will be created
  // E.g. to be able to mine, we can add a Mempool here: 'configBuilder.feature(Nimiq.Client.Feature.MEMPOOL);'

  // Create a client based on your configuration;
  // It will automatically connect to the network.
  const client = configBuilder.instantiateClient();

  //the app will try loading a previously stored wallet or otherwise create a new wallet, then display the wallet’s address, and finally make sure it’s stored
  const wallet = localStorage.wallet
    ? Nimiq.Wallet.loadPlain(JSON.parse(localStorage.wallet))
    : Nimiq.Wallet.generate();
  $("address").textContent = wallet.address.toUserFriendlyAddress();
  localStorage.wallet = JSON.stringify(Array.from(wallet.exportPlain()));

  // Store references
  nimiq.client = client;
  nimiq.network = client.network;
  nimiq.wallet = wallet;

  // Event handlers
  client.addConsensusChangedListener(onConsensusChanged);
  client.addHeadChangedListener(onHeadChanged);
  client.addTransactionListener(onTransaction, [wallet.address]);
  //Listen to the button being clicked
  $("tx_send").addEventListener("click", () => {
    const recipient = $("tx_recipient").value;
    const amount = parseFloat($("tx_amount").value);
    const message = $("tx_message").value; // <- get the message

    // We define this function in the next step
    sendTransaction(recipient, amount, message);
    // clear the form
    $("tx_recipient").value = $("tx_amount").value = $("tx_message").value = "";
  });
}

function onError(code) {
  switch (code) {
    case Nimiq.ERR_WAIT:
      alert("Error: Nimiq is already running in another tab or window.");
      break;
    case Nimiq.ERR_UNSUPPORTED:
      alert("Error: Browser not supported.");
      break;
    default:
      alert("Error: Nimiq initialization error.");
      break;
  }
}

// Start loading the Nimiq client library
// Nimiq.init() accepts an error handler as a second parameter (onError)
Nimiq.init(start, onError);
