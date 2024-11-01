import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { titleCase } from "../utils/text";
import actionSchemas from "../modules/actions/actions.schema";
import browserSchemas from "../modules/browser/browser.schema";
import seleniumSchemas from "../modules/selenium/selenium.schema";
import { buildJsonSchemas } from "../utils/schema";

const SCHEMAS = {
  ...actionSchemas,
  ...browserSchemas,
  ...seleniumSchemas,
};

export const { schemas, $ref } = buildJsonSchemas(SCHEMAS);

const schemaPlugin: FastifyPluginAsync = async (fastify) => {
  for (const schema of schemas) {
    fastify.addSchema(schema);
  }

  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: "Steel Browser Instance API",
        description: "Documentation for controlling a single instance of Steel Browser",
        version: "0.0.1",
      },
      servers: [
        {
          url: "http://localhost:3000",
          description: "Local server",
        },
      ],
      paths: {}, // paths must be included even if it's an empty object
      components: {
        securitySchemes: {},
      },
    },
    refResolver: {
      buildLocalReference: (json, baseUri, fragment, i) => {
        return titleCase(json.$id as string) || `Fragment${i}`;
      },
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: "/documentation",
    uiConfig: {
      docExpansion: "none", // expand/not all the documentations none|list|full
      deepLinking: true,
    },
  });
};

export default fp(schemaPlugin);
