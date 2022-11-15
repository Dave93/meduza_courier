require("dotenv").config();
const { GraphQLClient } = require("graphql-request");

module.exports = {
  client: new GraphQLClient(process.env.GRAPHQL_API_URL, {
    headers: {},
  }),
};
