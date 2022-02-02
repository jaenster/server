import {Client} from "./client";
import {EventTS} from "@jaenster/events";

export interface ClientHolder<C extends Client> {
    on<S = this>(key: 'added-client', handler: (client: C) => any, self?: object): this;

    once<S = this>(key: 'added-client', handler: (client: C) => any, self?: object): this;

    off<S = this>(key: 'added-client', handler: (client: C) => any, self?: object): this;

    emit<S = this>(key: 'added-client', client: C): this;

    on<S = this>(key: 'deleted-client', handler: (client: C) => any, self?: object): this;

    once<S = this>(key: 'deleted-client', handler: (client: C) => any, self?: object): this;

    off<S = this>(key: 'deleted-client', handler: (client: C) => any, self?: object): this;

    emit<S = this>(key: 'deleted-client', client: C): this;
}


export abstract class ClientHolder<C extends Client> extends EventTS {
    protected clients = new Set<C>();

    add(client: C) {
        this.clients.add(client);
        this.emit('added-client', client);
    }

    delete(client: C) {
        this.clients.delete(client);
        this.emit('deleted-client', client);
    }

    has(client: C) {
        return this.clients.has(client);
    }


    public filter(cb: (client: C) => any, predicate?: (client: C) => any) {
        const promised = [];
        for (const c of this.clients) {
            if (!predicate || predicate(c)) promised.push(cb);
        }
        return promised;
    }
}