import * as net from "net";
import {Client} from "./client";
import {Bucket} from "./bucket";
import {ClientHolder} from "./client-holder";
import {EventTS} from "@jaenster/events";

type Ctor<T> = { new(...[]): T }

type Writeable<T> = {
    -readonly [P in keyof T]: T[P];
}

type GetSharedFromClient<T> =
    T extends null | undefined ? T :
        T extends Client<infer U> ?
            U :
            never;

export class Server<C extends Client, Shared extends object = object> extends ClientHolder<C> implements EventTS {
    protected readonly nodeServer: net.Server = net.createServer(this.addSocket.bind(this));
    protected readonly clients: Set<C> = new Set();

    constructor(
        public readonly clientCtor: Ctor<C>,
        public readonly buckets: Bucket<C>[],
        public readonly shared?: GetSharedFromClient<C>,
    ) {
        super();

        let previous;
        for (const bucket of buckets) {
            bucket.server = this;
            if (previous) {
                (previous as Writeable<Bucket<C>>).next = bucket;
                (bucket as Writeable<Bucket<C>>).previous = previous;
            }
            previous = bucket;
        }
    }

    listen(port: number) {
        this.nodeServer.listen(port);
    }

    public async addSocket(socket: net.Socket) {
        const client = new this.clientCtor();
        const {shared, buckets: [bucket]} = this;

        Object.assign(client, {
            server: this,
            socket,
            bucket,
            shared,
        });
        await client.init();

        // Add to buckets
        this.add(client);
        bucket.add(client);

        return client;
    }
}