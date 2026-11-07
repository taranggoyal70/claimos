// Production must not use ephemeral disk for private cases or expose a local operator's data.
export function GET() {
  return Response.json({ mode:'LOCAL_BACKEND_REQUIRED',persistent:false,requiresToken:false,externalActionsEnabled:false,
    message:'The real workflow runs in your local workbench. Run npm run dev in the repository and open http://127.0.0.1:4173/workflow. Hosted private case storage is not configured.' },{headers:{'cache-control':'no-store'}});
}
export function POST() {
  return Response.json({error:{code:'LOCAL_BACKEND_REQUIRED',message:'Import real case data in the local workbench; this public deployment does not store private cases.'}},{status:503,headers:{'cache-control':'no-store'}});
}
