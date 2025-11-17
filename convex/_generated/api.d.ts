/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as captable from "../captable.js";
import type * as contracts from "../contracts.js";
import type * as dashboard from "../dashboard.js";
import type * as mutations_allowlist from "../mutations/allowlist.js";
import type * as mutations_contracts from "../mutations/contracts.js";
import type * as mutations_events from "../mutations/events.js";
import type * as mutations_indexer from "../mutations/indexer.js";
import type * as mutations_transfers from "../mutations/transfers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  captable: typeof captable;
  contracts: typeof contracts;
  dashboard: typeof dashboard;
  "mutations/allowlist": typeof mutations_allowlist;
  "mutations/contracts": typeof mutations_contracts;
  "mutations/events": typeof mutations_events;
  "mutations/indexer": typeof mutations_indexer;
  "mutations/transfers": typeof mutations_transfers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
