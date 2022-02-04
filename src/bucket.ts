import type {Client} from "./client";
import {Weaked} from "weaked";
import {Server} from "./server";
import {ClientHolder} from "./client-holder";

export class Bucket<C extends Client> extends ClientHolder<C> {
    constructor(public readonly name: string) {
        super()
    }

    @Weaked()
    readonly next: Bucket<C> | undefined;

    @Weaked()
    readonly previous: Bucket<C> | undefined;

    @Weaked()
    server: Server<C>;

    toNext(c: C) {
        if (!this.next) return this;

        this.next.add(c);
        this.delete(c);
        return this.next;
    }
}