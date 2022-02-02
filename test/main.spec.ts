import {Server, Bucket, Client} from "../src";
import {FakeSocket} from "fake-node-socket"

const delay = (ms = 0) => new Promise(r => setTimeout(r, ms));

describe('basic test', function () {
    const [clientSocketOut, clientSocketIn] = FakeSocket.createPair();

    const sequence = [1, 3, 3, 7];

    let incoming = [];

    class MyClient extends Client<{ test: number }> {
        protected incoming(buffer) {
            incoming.push(buffer);
        }

        init(): Promise<void> {
            return;
        }
    }

    let shared;
    const server = new Server(
        MyClient,
        [
            new Bucket('init'),
            new Bucket('handshake'),
            new Bucket('other'),
        ],
        shared = {
            // TS2322: Type 'string' is not assignable to type 'number'.
            // @ts-expect-error
            test: '',
        }
    );

    const models: { client: MyClient, buckets: Bucket<MyClient>[] } = {} as any;
    beforeAll(async () => {
        models.client = await server.addSocket(clientSocketOut);
        models.buckets = server.buckets;
    });


    test('client is defined', async function () {
        expect(models.client).toBeDefined();
        // @ts-ignore
        expect(models.client.server).toBeDefined();
        // @ts-ignore
        expect(models.client.bucket).toBeDefined();
    })

    test(`client's server is server`, async function () {
        //@ts-ignore
        expect(models.client.server).toBe(server);
    })

    test(`client's bucket is the first bucket`, async function () {
        //@ts-ignore
        expect(models.client.bucket).toBe(Object.values(models.buckets)[0]);
    })

    test('incoming message', async function () {

        clientSocketIn.write(Buffer.from(sequence));

        expect(incoming).toHaveLength(0);
        await delay(); // fake socket delay
        expect(incoming).toHaveLength(0);
        await delay(); // our delay
        expect(incoming).toHaveLength(1);

        const first = incoming.shift();
        expect([...first].join()).toBe(sequence.join());

    });

    test('outgoing messages', async function () {

        let resolve;
        const promise = new Promise<Buffer>(r => resolve = r);

        clientSocketIn.once('data', (data) => resolve(data));
        models.client.write(Buffer.from(sequence));

        const data = await promise;
        expect([...data].join()).toBe(sequence.join());

    });

    test('moving to next bucket', async function () {


        const [first, second] = models.buckets;


        expect(first.has(models.client)).toBeTruthy();
        expect(second.has(models.client)).not.toBeTruthy();

        //@ts-expect-error - is private
        models.client.upgrade();

        expect(first.has(models.client)).not.toBeTruthy();
        expect(second.has(models.client)).toBeTruthy();

    })

    test('test shared object', async function() {

        const {shared: copyTest} = models.client as any;
        expect(shared).toBe(copyTest);
        expect(shared.a).not.toBe('b')
        shared.a = 'b';
        expect(copyTest.a).toBe('b');

    })

});