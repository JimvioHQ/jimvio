export async function GET() {
  try {
    const binance1 = await fetch("https://api.binance.com/api/v3/time")
    const binance2 = await fetch("https://fapi.binance.com/fapi/v1/time")
    const ip = await fetch("https://checkip.amazonaws.com")

    const data1 = await binance1.text()
    const data2 = await binance2.text()
    const ipText = await ip.text()

    return Response.json({
      apiSpot: data1,
      apiFutures: data2,
      serverIp: ipText,
    })
  } catch (e: any) {
    return Response.json({
      error: e.message,
    })
  }
}
