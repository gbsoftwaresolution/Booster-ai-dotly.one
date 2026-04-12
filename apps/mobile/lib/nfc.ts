import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager'

let nfcStarted = false

export async function initNfc(): Promise<boolean> {
  const supported = await NfcManager.isSupported()
  if (!supported) return false
  if (!nfcStarted) {
    await NfcManager.start()
    nfcStarted = true
  }
  return true
}

export async function writeCardUrlToNfc(url: string): Promise<void> {
  await initNfc()
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef)
    const bytes = Ndef.encodeMessage([Ndef.uriRecord(url)])
    if (bytes) {
      await NfcManager.ndefHandler.writeNdefMessage(bytes)
    }
  } finally {
    NfcManager.cancelTechnologyRequest()
  }
}
