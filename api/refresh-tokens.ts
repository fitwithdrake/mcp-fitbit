import { refreshTokens } from "../src/lib/fitbit-auth";

export default async function handler(req, res) {
  await refreshTokens();
  res.status(200).json({status:"refreshed"});
}
