import { Type, type FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

/** Local, stateless example: validates a text draft and returns metadata without reflecting it. */
export const textPreviewRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    "/text-preview",
    {
      schema: {
        body: Type.Object(
          { text: Type.String({ minLength: 1, maxLength: 4096 }) },
          {
            additionalProperties: false,
          },
        ),
        response: {
          200: Type.Object(
            { characters: Type.Integer({ minimum: 1 }), lines: Type.Integer({ minimum: 1 }) },
            {
              additionalProperties: false,
            },
          ),
        },
      },
    },
    async (request) => ({
      characters: Array.from(request.body.text).length,
      lines: request.body.text.split(/\r\n|\r|\n/).length,
    }),
  );
};
