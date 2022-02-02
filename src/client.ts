import {EventTS} from "@jaenster/events";
import {Weaked} from "weaked";
import net from "net";
import {Server} from "./server";
import {BurstQueue} from "@jaenster/queues";
import type {Bucket} from "./bucket";

export abstract class Client<SharedData=any> extends EventTS {

    @Weaked()
    private readonly server: Server<this>

    @Weaked()
    private readonly bucket: Bucket<this>

    @Weaked()
    protected readonly shared: SharedData;

    #socket: net.Socket;

    // socket gets set by an object.assign in the server
    protected set socket(socket: net.Socket) {
        if (this.#socket) {
            this.#socket.removeAllListeners('data');
        }
        this.#socket = socket;
        socket.on('data', this.queueIn.add.bind(this.queueIn));
    }

    // Out queue gets filled by write
    protected queueOut = new BurstQueue<Buffer | string>(bq => bq.forEach((buffer) => this.#socket.write(buffer)));

    // In queue gets filled by socket.on
    protected queueIn = new BurstQueue<Buffer>(async (bq) => {
        for (const buffer of bq) await this.incoming(buffer);
    });

    write(...buffer: (Buffer | string)[]) {
        this.queueOut.add(...buffer);
    }

    protected abstract incoming(buffer: Buffer)

    protected upgrade() {
        this.bucket.toNext(this);
    }

    abstract init(): Promise<void>;
}