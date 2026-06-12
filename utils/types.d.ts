import {
    ButtonInteraction,
    ChatInputCommandInteraction as djsChatInputCommandInteraction,
    Interaction,

    PermissionResolvable,
} from "discord.js";

import DogClient from "./customs/client.js";

// #region [Interactions]

export type ChatInputCommandInteraction = ChatInputCommandInteractionFromContext<AllowedContextTuple>;

export type ValidInteraction =
    | Interaction
    | ChatInputCommandInteraction;

export enum CommandCategory {
    "General",
    "Music",
    "RPG",
    "Special",
    "Dev",
};

// 允許的 context (組合使用元組聯合)
type AllowedContextTuple =
    | readonly ["dm"]
    | readonly ["guild"]
    | readonly ["dm", "guild"]
// | readonly ["guild", "dm"];

// 根據 context 推斷 interaction 的 guild 屬性
type ChatInputCommandInteractionFromContext<C extends AllowedContextTuple> =
    C extends readonly ["dm"]
    ? djsChatInputCommandInteraction & { guild: null }
    : C extends readonly ["guild"]
    ? djsChatInputCommandInteraction & { guild: NonNullable<djsChatInputCommandInteraction["guild"]> }
    : djsChatInputCommandInteraction; // 允許 DM 與 guild 的原始型別

export type ButtonExecutor = (
    interaction: ButtonInteraction,
    args?: string[],
) => PromiseLike<unknown>;

export type SlashExecutor<C extends AllowedContextTuple = AllowedContextTuple> = (
    interaction: ChatInputCommandInteractionFromContext<C>,
    client: DogClient,
) => PromiseLike<unknown>;

export interface BaseSlash<C extends AllowedContextTuple = AllowedContextTuple> {
    builder: any;
    stage: "beta" | "stable" | "owner" | "admin";
    allowedContext: C;
    music?: boolean = false;
    alias?: string[] = [];
    category?: CommandCategory = "General";
    subCommands?: Record<string, SlashExecutor<C>>;
    permissions?: {
        bot?: PermissionResolvable[];
        user?: PermissionResolvable[];
    };
    execute: SlashExecutor<C>;
}

// Slash 聯合型別：至少要有 execute 或 subCommands 之一
export type Slash<C extends AllowedContextTuple = AllowedContextTuple> =
    | (BaseSlash<C> & Required<Pick<BaseSlash<C>, "execute">>)
    | (BaseSlash<C> & Required<Pick<BaseSlash<C>, "subCommands">>);

// #endregion [Interactions]
