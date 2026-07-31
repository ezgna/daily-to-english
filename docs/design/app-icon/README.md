# App icon

## Production asset

- `assets/app.icon`: iOS用のIcon Composerファイル。`app.json`の`ios.icon`から参照する。
- `assets/images/icon.png`: 共通・旧Android用の1024px PNGアイコン。
- `assets/icons/android/foreground.png`: Android Adaptive Iconの前景。
- `assets/icons/android/monochrome.png`: Android 13以降のテーマアイコン用モノクロレイヤー。
- `assets/icons/android/play-store.png`: Google Play提出用の512px PNG。

## Design files

- このディレクトリ直下のPNGはデザイン検討時の生成候補。
- `sources/`はIcon Composer用レイヤーを作成した際の素材。
- `ios/`内の`.icon`はExpoが生成するため、正本として編集しない。
