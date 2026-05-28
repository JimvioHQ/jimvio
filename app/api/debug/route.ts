export async function GET() {
  try {
    const binance1 = await fetch("https://api.binance.com/api/v3/time")
    const binance2 = await fetch("https://fapi.binance.com/fapi/v1/time")
    const ip = await fetch("https://checkip.amazonaws.com")

    return Response.json({
      spot: await binance1.text(),
      futures: await binance2.text(),
      ip: await ip.text(),
    })
  } catch (error: any) {
    return Response.json({
      error: error.message,
    })
  }
}
