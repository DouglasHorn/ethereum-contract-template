const { BN, constants, expectEvent, expectRevert, balance } = require("@openzeppelin/test-helpers");
const { web3 } = require("@openzeppelin/test-helpers/src/setup");
const Splitter = artifacts.require("Splitter");
const StepSplitERC721 = artifacts.require("StepSplitERC721");

contract("StepSplitERC721 Contract Tests", async accounts => {
    const [deployer, userA, userB, userC] = accounts;
    const tokenName = "SPLIT Tokens";
    const tokenSymbol = "SPLIT";
    const baseURI = "https://some.public.api/endpoint/";
    const maxSupply = 100;
    
    let stepPrice = `${1*1e18}`; //1 ETH
    let freeMints = 1;
    let stride = 5;
    let splitterAddress;

    before(async () => {
        //initialize contract array
        this.contracts = [];

        //deploy initial contracts
        this.contracts[0] = await Splitter.new([userB, userC], [80, 20], {from: deployer});
        splitterAddress = this.contracts[0].address;
    });

    it("Can deploy contract", async () => {
        //deploy contract
        this.contracts[1] = await StepSplitERC721.new(tokenName, tokenSymbol, maxSupply, splitterAddress, {from: deployer});
    });

    it("Can get max supply", async () => {
        //query contract
        const q1 = await this.contracts[1].maxSupply();

        //check query
        assert.equal(q1.toNumber(), maxSupply);
    });

    it("Can get paused state (Pausable)", async () => {
        //query contract
        const q1 = await this.contracts[1].paused();

        //check query
        assert.equal(q1, false);
    });

    it("Can get contract owner (Ownable)", async () => {
        //query contract
        const q1 = await this.contracts[1].owner();

        //check query
        assert.equal(q1, deployer);
    });

    it("Can get token name (IERC721Metadata)", async () => {
        //query contract
        const q1 = await this.contracts[1].name();
        
        //check query
        assert.equal(q1, tokenName);
    });

    it("Can get token symbol (IERC721Metadata)", async () => {
        //query contract
        const q1 = await this.contracts[1].symbol();

        //check query
        assert.equal(q1, tokenSymbol);
    });

    it("Can set and get stride", async () => {
        //send setStride transaction
        const t1 = await this.contracts[1].setStride(stride, {from: deployer});

        //query contract
        const q1 = await this.contracts[1].stride();

        //check query
        assert.equal(q1, stride);
    });

    it("Can set and get step price", async () => {
        //send setStepPrice transaction
        const t1 = await this.contracts[1].setStepPrice(stepPrice, {from: deployer});

        //query contract
        const q1 = await this.contracts[1].stepPrice();

        //check query
        assert.equal(q1, stepPrice);
    });

    it("Can set and get free mint count", async () => {
        //send mint transaction
        const t1 = await this.contracts[1].setFreeMints(freeMints, {from: deployer});

        //query contract
        const q1 = await this.contracts[1].freeMints();

        //check query
        assert.equal(q1, freeMints);
    });

    it("Can set and get base uri", async () => {
        //send setBaseURI transaction
        const t1 = await this.contracts[1].setBaseURI(baseURI, {from: deployer});

        //query contract
        const q1 = await this.contracts[1].baseURI();

        //check query
        assert.equal(q1, baseURI);
    });

    it("Can get steps", async () => {
        //query contract
        const q1 = await this.contracts[1].steps();

        //check query
        assert.equal(q1, 1);
    });

    it("Can get price", async () => {
        //query contract
        const q1 = await this.contracts[1].getPrice();

        //check query
        assert.equal(q1.toString(), `${1*1e18}`);
    });

    it("Can mint free token", async () => {
        //send mint transaction
        const t1 = await this.contracts[1].mint({from: userA});

        //check event emitted
        expectEvent(t1, 'Transfer', {
            from: constants.ZERO_ADDRESS,
            to: userA,
            tokenId: "0"
        });

        //query post state
        const q1 = await this.contracts[1].mintCount();
    });

    it("Can mint paid token", async () => {
        //query pre state
        const splitterTracker = await balance.tracker(splitterAddress, 'wei');
        const buyerTracker = await balance.tracker(userA, 'wei');
        const price = await this.contracts[1].getPrice();

        //get initial balance
        const splitterPreBal = await splitterTracker.get();
        const buyerPreBal = await buyerTracker.get();

        //send mint transaction
        const t1 = await this.contracts[1].mint({from: userA, value: price});

        //check event emitted
        expectEvent(t1, 'Transfer', {
            from: constants.ZERO_ADDRESS,
            to: userA,
            tokenId: "1"
        });

        //query post state
        const q1 = await this.contracts[1].mintCount();
        const splitterDelta = await splitterTracker.delta();
        // const { delta, fees } = await buyerTracker.deltaWithFees();

        //check queries
        assert.equal(q1.toNumber(), 2);
        assert.equal(splitterDelta.toString(), price.toString());
        // assert.equal(delta, basePrice + fees);
    });

    it("Can get token uri (IERC721Metadata)", async () => {
        //query contract
        const q1 = await this.contracts[1].tokenURI(0);
        const q2 = await this.contracts[1].tokenURI(1);
        
        //check query
        assert.equal(q1, baseURI + "0");
        assert.equal(q2, baseURI + "1");
    });

    //---------- Splitter ----------

    it("Can get total shares (PaymentSplitter)", async () => {
        //query contract
        const q1 = await this.contracts[0].totalShares();
        
        //check query
        assert.equal(q1, 100);
    });

    it("Can get owned shares (PaymentSplitter)", async () => {
        //query contract
        const q1 = await this.contracts[0].shares(userB);
        const q2 = await this.contracts[0].shares(userC);
        
        //check query
        assert.equal(q1, 80);
        assert.equal(q2, 20);
    });

    it("Can get payees (PaymentSplitter)", async () => {
        //query contract
        const q1 = await this.contracts[0].payee(0);
        const q2 = await this.contracts[0].payee(1);
        
        //check query
        assert.equal(q1, userB);
        assert.equal(q2, userC);
    });

    it("Can get total released (PaymentSplitter)", async () => {
        //query contract
        const q1 = await this.contracts[0].totalReleased();
        
        //check query
        assert.equal(q1, 0);
    });

    it("Can release tokens", async () => {
        //send transaction
        const t1 = await this.contracts[0].release(userB, {from: userA});
        const t2 = await this.contracts[0].release(userC, {from: userA});

        //check event emitted
        expectEvent(t1, 'PaymentReleased', {
            to: userB,
            amount: `${0.8*1e18}`
        });
        expectEvent(t2, 'PaymentReleased', {
            to: userC,
            amount: `${0.2*1e18}`
        });

        //query post state
        const q1 = await this.contracts[0].totalReleased();

        //check query
        assert.equal(q1, `${1*1e18}`);
    });

});