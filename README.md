# Beach Tennis Super 8

Aplicativo mobile para gerenciar eventos/torneios de Beach Tennis no formato "Super 8".

## Stack

- **Framework:** React Native com Expo (SDK 51)
- **Linguagem:** TypeScript
- **Navegação:** Expo Router
- **Estado:** Zustand
- **Banco de Dados:** SQLite (expo-sqlite)
- **Testes:** Jest

## Formato de Eventos

O app suporta 3 formatos:

1. **Grupos + Finais:** 8 duplas divididas em 2 grupos, seguido de semifinais e final
2. **Pontos Corridos:** Todas as duplas jogam entre si (round-robin completo)
3. **Super 8 Rotativo:** Jogadores trocam de parceiro a cada rodada

## Instalação

```bash
npm install
```

## Executar

```bash
# Desenvolvimento
npm start

# Android
npm run android

# iOS
npm run ios
```

## Testes

### Testes Unitários

Execute os testes unitários com Jest:

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch (re-execução automática)
npm run test:watch
```

Os testes estão localizados em `src/**/__tests__/` e testam principalmente:
- Algoritmos de geração de jogos (Grupos + Finais, Round-Robin, Rotativo)
- Cálculo de ranking
- Lógica de negócio

### Testar o App em Execução

#### 1. Modo Web (Navegador)
```bash
npm run web
```
Abre o app no navegador - útil para desenvolvimento rápido e debug.

#### 2. Modo Desenvolvimento (Expo Dev Client)
```bash
npm start
```
Inicia o servidor de desenvolvimento Expo. Escaneie o QR code com:
- **Android**: Expo Go app ou Android Studio emulador
- **iOS**: Expo Go app ou Xcode simulador
- **Web**: Pressione `w` para abrir no navegador

#### 3. Android
```bash
npm run android
```
Abre automaticamente no emulador Android ou dispositivo físico conectado.

#### 4. iOS (apenas macOS)
```bash
npm run ios
```
Abre automaticamente no simulador iOS (requer Xcode).

### Testando no Dispositivo Físico

1. **Instale o Expo Go** no seu dispositivo:
   - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)

2. **Execute** `npm start`

3. **Escaneie o QR code** exibido no terminal com:
   - Android: Câmera do dispositivo ou Expo Go
   - iOS: Câmera do dispositivo

### Requisitos

- **Node.js** (versão 18 ou superior)
- **npm** ou **yarn**
- Para Android: Android Studio e emulador/configurado
- Para iOS: Xcode (apenas macOS)

## Estrutura do Projeto

```
/src
  /app          # Rotas (Expo Router)
  /components    # Componentes reutilizáveis
  /features      # Features (eventos, participantes, partidas)
  /db            # SQLite, migrações, repositories
  /domain        # Modelos, regras, algoritmos
  /services      # Serviços (export, share, etc)
  /state         # Store (Zustand)
/docs            # Documentação
```

## Documentação

Consulte a pasta `/docs` para:
- `requisitos.md` - Requisitos do MVP
- `ux-fluxos.md` - Mapa de navegação e microcopy
- `modelagem-dados.md` - Estrutura do banco de dados
- `algoritmos.md` - Algoritmos de geração de jogos
