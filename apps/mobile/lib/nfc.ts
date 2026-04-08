import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager'

export async function initNfc(): Promise<boolean> {
  return NfcManager.isSupported()
}

export async function writeCardUrlToNfc(url: string): Promise<void> {
  // NfcManager.start() is intentionally NOT called here.
  // start() is a one-time initialisation that must be called once at app startup
  // (in initNfc / NfcWriteButton mount). Calling it again before every write
  // causes a double-init error on Android and a warning on iOS. The caller is
  // responsible for ensuring NFC is initialised before invoking this function.
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
