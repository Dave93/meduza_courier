require("dotenv").config();
import { GraphQLClient } from "graphql-request";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
export const client = new GraphQLClient(process.env.GRAPHQL_API_URL, {
  headers: {},
});
