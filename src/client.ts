import {EventTS} from "@jaenster/events";
import {BurstQueue} from "@jaenster/queues";
import {Weaked} from "weaked";
import net from "net";
import {Server} from "./server";
import {ClientHolder} from "./client-holder";
import type {Bucket} from "./bucket";
import {WeakRefSet} from "weakrefset";

export interface Client<SharedData = any> {
    on<S extends Client<SharedData>= this>(key: 'added-to', handler: (holder: ClientHolder<S>) => any, self?: object): this;
    once<S extends Client<SharedData>= this>(key: 'added-to', handler: (holder: ClientHolder<S>) => any, self?: object): this;
    off<S extends Client<SharedData>= this>(key: 'added-to', handler: (holder: ClientHolder<S>) => any, self?: object): this;
    emit<S extends Client<SharedData>= this>(key: 'added-to', holder: ClientHolder<S>): this;

    on<S extends Client<SharedData>= this>(key: 'deleted-from', handler: (holder: ClientHolder<S>) => any, self?: object): this;
    once<S extends Client<SharedData>= this>(key: 'deleted-from', handler: (holder: ClientHolder<S>) => any, self?: object): this;
    off<S extends Client<SharedData>= this>(key: 'deleted-from', handler: (holder: ClientHolder<S>) => any, self?: object): this;
    emit<S extends Client<SharedData>= this>(key: 'deleted-from', holder: ClientHolder<S>): this;
}

export abstract class Client<SharedData = any> extends EventTS {

    @Weaked()
    protected readonly server: Server<this>

    @Weaked()
    protected readonly bucket: Bucket<this>;

    protected readonly memberOf: WeakRefSet<ClientHolder<this>> = new WeakRefSet<ClientHolder<this>>();

    add(holder: ClientHolder<this>) {
        this.memberOf.add(holder);
        this.emit('added-to', holder);
    }

    delete(holder: ClientHolder<this>) {
        this.memberOf.delete(holder);
        this.emit('deleted-from', holder);
    }

    forEach(...args: Parameters<typeof WeakRefSet.prototype.forEach>) {
        this.memberOf.forEach(...args);
    }

    @Weaked()
    protected readonly shared: SharedData;

    #socket: net.Socket;

    // socket gets set by an object.assign in the server
    private set socket(socket: net.Socket) {
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
        (this as any).bucket = this.bucket.toNext(this as any);
    }

    abstract init(): Promise<void>;
}