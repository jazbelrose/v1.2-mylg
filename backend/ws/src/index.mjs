export const handler = async (event) => {
  const route = event.requestContext.routeKey; // "$connect" | "$disconnect" | "$default" | "sendMessage" | …
  
  switch (route) {
    case "$connect":
      // auth token from queryStringParameters?.token, store connectionId in DB
      console.log("WebSocket connection established", { connectionId: event.requestContext.connectionId });
      // TODO: Validate auth token and store connectionId
      return { statusCode: 200, body: "ok" };
      
    case "$disconnect":
      // remove connectionId from DB
      console.log("WebSocket connection closed", { connectionId: event.requestContext.connectionId });
      // TODO: Remove connectionId from database
      return { statusCode: 200, body: "bye" };
      
    case "$default":
      // guard / ignore unknown messages
      console.log("Unknown WebSocket message", { route, body: event.body });
      return { statusCode: 200, body: "noop" };
      
    // custom route example:
    case "sendMessage":
      // parse body, fan-out via ApiGatewayManagementApi to connectionIds
      console.log("Sending message", { connectionId: event.requestContext.connectionId, body: event.body });
      
      // TODO: Parse message body and send to target connections
      // Example:
      // const { AWS } = await import('@aws-sdk/client-apigatewaymanagementapi');
      // const apiGateway = new AWS.ApiGatewayManagementApi({
      //   endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`
      // });
      // await apiGateway.postToConnection({
      //   ConnectionId: targetConnectionId,
      //   Data: JSON.stringify(messageData)
      // });
      
      return { statusCode: 200, body: "sent" };
      
    default:
      console.log("Unhandled WebSocket route", { route });
      return { statusCode: 200, body: "noop" };
  }
};
