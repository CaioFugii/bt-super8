# 🚀 Guia Completo de Publicação - Beach Tennis Super 8
## Google Play Store - Primeira Publicação (MVP)

**Versão do App:** 1.0.0  
**Framework:** Expo SDK 51  
**Data:** Dezembro 2024

---

## 📋 Índice

1. [Validação Técnica do Projeto](#1-validação-técnica-do-projeto)
2. [Assinatura e Build de Produção](#2-assinatura-e-build-de-produção)
3. [Google Play Console - Setup Inicial](#3-google-play-console---setup-inicial)
4. [Criação do App no Play Console](#4-criação-do-app-no-play-console)
5. [Store Listing (Página da Loja)](#5-store-listing-página-da-loja)
6. [Políticas, Privacidade e Compliance](#6-políticas-privacidade-e-compliance)
7. [Publicação e Revisão](#7-publicação-e-revisão)
8. [Pós-Publicação](#8-pós-publicação)

---

## 1️⃣ Validação Técnica do Projeto

### ✅ Checklist de Validação Técnica

#### 1.1 Configurações do app.json

**Status Atual:**
- ✅ `name`: "Beach Tennis Super 8"
- ✅ `slug`: "beach-tennis-super8"
- ✅ `version`: "1.0.0"
- ✅ `package`: "com.beachtennissuper8.app"
- ⚠️ **AÇÃO NECESSÁRIA:** Adicionar `versionCode` no Android

**Ajustes Necessários:**

```json
{
  "expo": {
    "android": {
      "package": "com.beachtennissuper8.app",
      "versionCode": 1,
      "permissions": []
    }
  }
}
```

#### 1.2 Versões do SDK Android

**Configurações Recomendadas para Expo SDK 51:**
- `minSdkVersion`: 23 (Android 6.0) - **OK para Expo SDK 51**
- `targetSdkVersion`: 34 (Android 14) - **OK para Expo SDK 51**
- `compileSdkVersion`: 34 - **Gerenciado pelo Expo**

**Validação:**
- ✅ Expo SDK 51 já configura automaticamente versões adequadas
- ✅ Não requer ajustes manuais

#### 1.3 Flags de Debug/Desenvolvimento

**Status Atual:**
- ⚠️ Encontrados `console.log/warn/error` em:
  - `src/db/database.ts` (4 ocorrências)
  - `src/db/init.ts` (2 ocorrências)

**Ação Recomendada:**
- Remover ou condicionar logs em produção
- Usar `__DEV__` do React Native para logs de desenvolvimento

**Exemplo de Correção:**
```typescript
// ❌ Antes
console.log('Database initialized successfully');

// ✅ Depois
if (__DEV__) {
  console.log('Database initialized successfully');
}
```

#### 1.4 ProGuard / R8

**Status:**
- ✅ Expo gerencia automaticamente minificação e ofuscação
- ✅ R8 ativado por padrão em builds de produção
- ✅ Não requer configuração manual

#### 1.5 Remoção de Logs Sensíveis

**Checklist:**
- [ ] Remover/condicionar todos os `console.log`
- [ ] Remover/condicionar todos os `console.warn`
- [ ] Manter apenas `console.error` críticos (ou condicionar)
- [ ] Verificar se há dados sensíveis em logs

#### 1.6 Configuração para Produção

**Checklist:**
- [x] `app.json` configurado
- [ ] `versionCode` adicionado
- [ ] Logs condicionados
- [ ] Ícone e splash screen configurados
- [ ] Adaptive icon configurado

---

## 2️⃣ Assinatura e Build de Produção

### 2.1 EAS Build (Recomendado para Expo)

**Expo Application Services (EAS)** é a forma mais simples e segura de gerar builds assinados.

#### Passo 1: Instalar EAS CLI

```bash
npm install -g eas-cli
```

#### Passo 2: Login no Expo

```bash
eas login
```

#### Passo 3: Configurar EAS Build

```bash
eas build:configure
```

Isso criará o arquivo `eas.json` com configurações de build.

#### Passo 4: Criar Keystore (Primeira Vez)

O EAS gerencia automaticamente o keystore na primeira build de produção. Você precisará:

1. **Salvar as credenciais** fornecidas pelo EAS
2. **Fazer backup** das credenciais em local seguro
3. **Nunca perder** essas credenciais (necessárias para atualizações)

**⚠️ CRÍTICO:** Sem o keystore, você não poderá atualizar o app na Play Store.

#### Passo 5: Build de Produção

```bash
eas build --platform android --profile production
```

**Perfis Recomendados no `eas.json`:**

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### 2.2 Build Local (Alternativa)

**⚠️ NÃO RECOMENDADO para primeira publicação**, mas possível:

#### Pré-requisitos:
1. Gerar keystore manualmente
2. Configurar assinatura no `app.json`
3. Build local com `expo build:android`

**Comando para gerar keystore:**
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore beach-tennis-super8.jks -alias beach-tennis-super8 -keyalg RSA -keysize 2048 -validity 10000
```

**⚠️ IMPORTANTE:**
- Guarde a senha do keystore em local seguro
- Faça backup do arquivo `.jks`
- Adicione `.jks` ao `.gitignore` (já está)

### 2.3 Checklist de Build

- [ ] EAS CLI instalado
- [ ] Login no Expo realizado
- [ ] `eas.json` configurado
- [ ] Build de produção executada
- [ ] AAB (Android App Bundle) gerado
- [ ] Credenciais do keystore salvas e com backup
- [ ] AAB testado em dispositivo físico (se possível)

---

## 3️⃣ Google Play Console - Setup Inicial

### 3.1 Criação da Conta Google Play Developer

**Passo 1: Acessar**
- URL: https://play.google.com/console
- Use uma conta Google profissional (não pessoal recomendado)

**Passo 2: Pagar Taxa Única**
- **Valor:** $25 USD (taxa única, válida para sempre)
- **Forma de Pagamento:** Cartão de crédito/débito internacional
- **Processamento:** Imediato

**Passo 3: Preencher Perfil do Desenvolvedor**

**Dados Obrigatórios:**
- **Nome do desenvolvedor:** (ex: "Beach Tennis Super 8" ou seu nome)
- **E-mail de contato:** (será público na Play Store)
- **Site:** (obrigatório - pode ser GitHub Pages, site simples, etc.)
- **Telefone:** (opcional, mas recomendado)

**⚠️ IMPORTANTE:**
- Nome do desenvolvedor aparece na Play Store
- E-mail será público
- Site deve estar acessível (pode ser temporário)

### 3.2 Validações Iniciais

**Checklist:**
- [ ] Conta Google criada/verificada
- [ ] Taxa de $25 USD paga
- [ ] Perfil do desenvolvedor completo
- [ ] E-mail de contato configurado
- [ ] Site configurado e acessível
- [ ] Telefone adicionado (recomendado)

---

## 4️⃣ Criação do App no Play Console

### 4.1 Criar Novo App

**Passo 1:**
1. Acesse Play Console
2. Clique em "Criar app"
3. Preencha:

**Nome do app:**
```
Beach Tennis Super 8
```

**Idioma padrão:**
```
Português (Brasil)
```

**Tipo de aplicativo:**
```
App
```

**Gratuito ou pago:**
```
Gratuito
```

**Declaração de distribuição:**
```
Sim, declaro que este app está em conformidade com a Política de conteúdo do Google Play e com a Política de programa para desenvolvedores do Google Play
```

### 4.2 Configurações Iniciais

**Categoria:**
```
Esportes
```

**Público-alvo:**
```
Todos
```

**⚠️ ATENÇÃO:** Se o app for direcionado a crianças, selecione "Crianças" e preencha questionário adicional.

### 4.3 Questionário de Classificação Indicativa (IARC)

**Para Brasil:**
- **Classificação:** Livre (L)
- **Justificativa:** App de gerenciamento de torneios esportivos, sem conteúdo inadequado

**Perguntas Comuns:**
- **Violência:** Não
- **Sexo/Nudez:** Não
- **Linguagem:** Não
- **Drogas:** Não
- **Jogos de azar:** Não

### 4.4 Declaração de Anúncios

**Para este app:**
- **O app contém anúncios?** Não
- **O app usa SDK de anúncios?** Não

**✅ Confirmar:** App não contém anúncios

### 4.5 Checklist de Criação do App

- [ ] App criado no Play Console
- [ ] Nome configurado
- [ ] Idioma padrão: Português (Brasil)
- [ ] Categoria: Esportes
- [ ] Público-alvo: Todos
- [ ] Classificação indicativa preenchida
- [ ] Declaração de anúncios: Não contém anúncios

---

## 5️⃣ Store Listing (Página da Loja)

### 5.1 Textos Prontos para Copiar e Colar

#### Nome do Aplicativo
```
Beach Tennis Super 8
```

#### Descrição Curta (até 80 caracteres)
```
Gerencie torneios de Beach Tennis com 3 formatos diferentes
```

#### Descrição Completa

```
Gerencie seus torneios de Beach Tennis de forma profissional e intuitiva!

O Beach Tennis Super 8 é o aplicativo ideal para organizadores de eventos e torneios de Beach Tennis. Com três formatos diferentes de competição, geração automática de jogos e ranking em tempo real, você tem tudo que precisa para gerenciar seu evento.

🎾 FORMATOS DISPONÍVEIS

• Grupos + Finais: 8 duplas divididas em 2 grupos, seguido de semifinais e final
• Pontos Corridos: Todas as duplas jogam entre si (round-robin completo)
• Super 8 Rotativo: Jogadores trocam de parceiro a cada rodada

📊 FUNCIONALIDADES

✓ Criação rápida de eventos com wizard intuitivo
✓ Gerenciamento completo de participantes e duplas
✓ Geração automática de jogos e rodadas
✓ Registro de resultados em tempo real
✓ Ranking atualizado automaticamente
✓ Compartilhamento de resultados
✓ Funciona offline - todos os dados salvos localmente

🏆 IDEAL PARA

• Organizadores de torneios
• Clubes e associações
• Eventos casuais e profissionais
• Competições amadoras e oficiais

📱 CARACTERÍSTICAS

• Interface simples e intuitiva
• Funciona sem internet
• Dados salvos localmente no dispositivo
• Sem anúncios
• Totalmente gratuito

Baixe agora e transforme a organização dos seus torneios de Beach Tennis!
```

### 5.2 Assets Visuais

#### Checklist de Imagens Obrigatórias

**Ícone do App:**
- [ ] Tamanho: 512x512 px (PNG, sem transparência)
- [ ] Localização: `./assets/icon.png`
- [ ] ✅ Já configurado no `app.json`

**Screenshots (Mínimo 2, Recomendado 4-8):**
- [ ] Tamanho: Mínimo 320px, máximo 3840px (largura)
- [ ] Proporção: 16:9 ou 9:16 (portrait)
- [ ] Formato: PNG ou JPEG
- [ ] Sem texto, bordas ou sobreposições

**Screenshots Recomendados:**
1. Tela inicial (lista de eventos)
2. Criação de evento (wizard)
3. Agenda de jogos
4. Ranking
5. Detalhes de um jogo
6. Gerenciamento de participantes

**Feature Graphic (Banner):**
- [ ] Tamanho: 1024x500 px
- [ ] Formato: PNG ou JPEG
- [ ] Texto opcional (recomendado: nome do app)
- [ ] ⚠️ **NECESSÁRIO CRIAR**

**Adaptive Icon:**
- [ ] Foreground: 1024x1024 px
- [ ] Background: Cor sólida ou gradiente
- [ ] ✅ Já configurado no `app.json`

### 5.3 Boas Práticas de ASO (App Store Optimization)

**Palavras-chave na Descrição:**
- beach tennis
- torneio
- ranking
- gerenciamento
- esportes
- competição
- duplas
- super 8

**Estrutura da Descrição:**
- ✅ Primeira linha impactante
- ✅ Emojis para destaque
- ✅ Lista de funcionalidades
- ✅ Público-alvo claro
- ✅ Call-to-action no final

### 5.4 Checklist de Store Listing

- [ ] Nome do app preenchido
- [ ] Descrição curta (80 caracteres)
- [ ] Descrição completa
- [ ] Ícone 512x512 configurado
- [ ] Feature graphic 1024x500 criado
- [ ] Mínimo 2 screenshots adicionados
- [ ] Adaptive icon configurado
- [ ] Categoria: Esportes
- [ ] Tags/Keywords (se disponível)

---

## 6️⃣ Políticas, Privacidade e Compliance

### 6.1 Política de Privacidade

**⚠️ OBRIGATÓRIA** para apps na Play Store.

**Quando é obrigatória:**
- ✅ Sempre (Google exige para todos os apps)
- ✅ Especialmente se o app coleta dados pessoais
- ✅ Especialmente se o app usa permissões sensíveis

**Para este app:**
- ✅ App armazena dados localmente (SQLite)
- ✅ Não coleta dados pessoais online
- ✅ Não usa analytics externos
- ✅ Não requer login
- ✅ Não envia dados para servidores

**Template de Política de Privacidade:**

Veja arquivo separado: `POLITICA_PRIVACIDADE.md`

### 6.2 Declaração de Dados Coletados

**No Play Console, declare:**

**Dados Pessoais:**
- ✅ **Nome:** Coletado (armazenado localmente no dispositivo)
- ✅ **Justificativa:** Necessário para gerenciar participantes dos eventos

**Dados Sensíveis:**
- ❌ Nenhum dado sensível coletado

**Analytics:**
- ❌ Não usa Google Analytics
- ❌ Não usa Firebase Analytics
- ❌ Não usa outros serviços de analytics

**Crash Reporting:**
- ❌ Não usa serviços de crash reporting externos

**Login:**
- ❌ Não requer login
- ❌ Não usa autenticação externa

**⚠️ IMPORTANTE:**
- Declare apenas o que realmente é coletado
- Seja específico e honesto
- Atualize se adicionar funcionalidades futuras

### 6.3 Conformidade com Políticas Google Play

#### Principais Causas de Reprovação e Como Evitar

**1. Política de Privacidade Ausente ou Incompleta**
- ✅ **Solução:** Criar política completa e acessível
- ✅ **Verificação:** Link funcionando, conteúdo adequado

**2. Declaração de Dados Incorreta**
- ✅ **Solução:** Declarar apenas dados realmente coletados
- ✅ **Verificação:** Revisar todas as declarações

**3. Permissões Não Justificadas**
- ✅ **Solução:** Este app não requer permissões especiais
- ✅ **Verificação:** Confirmar que nenhuma permissão desnecessária está declarada

**4. Conteúdo Inadequado**
- ✅ **Solução:** App é sobre esportes, sem conteúdo inadequado
- ✅ **Verificação:** Revisar todas as telas e textos

**5. Funcionalidades Quebradas**
- ✅ **Solução:** Testar app completamente antes de publicar
- ✅ **Verificação:** Testar em diferentes dispositivos Android

**6. Nome/Descrição Enganosa**
- ✅ **Solução:** Usar textos claros e honestos
- ✅ **Verificação:** Revisar Store Listing

**7. Ícone/Screenshots Inadequados**
- ✅ **Solução:** Usar imagens apropriadas
- ✅ **Verificação:** Revisar todas as imagens

### 6.4 Conformidade com LGPD (Lei Geral de Proteção de Dados)

**Para este app:**
- ✅ Dados armazenados apenas localmente
- ✅ Usuário tem controle total sobre seus dados
- ✅ Não há compartilhamento de dados com terceiros
- ✅ Política de privacidade deve mencionar LGPD

**Checklist LGPD:**
- [ ] Política de privacidade menciona LGPD
- [ ] Explica como dados são armazenados (localmente)
- [ ] Explica direitos do usuário (acesso, exclusão)
- [ ] Menciona que dados não são compartilhados

### 6.5 Checklist de Compliance

- [ ] Política de privacidade criada
- [ ] Link da política de privacidade acessível
- [ ] Política adicionada no Play Console
- [ ] Declaração de dados preenchida corretamente
- [ ] Nenhuma permissão desnecessária declarada
- [ ] Conformidade com LGPD verificada
- [ ] Revisão de políticas Google Play realizada

---

## 7️⃣ Publicação e Revisão

### 7.1 Criação da Release de Produção

**Passo 1: Acessar Produção**
1. No Play Console, vá em "Produção"
2. Clique em "Criar nova versão"

**Passo 2: Upload do AAB**
1. Faça upload do arquivo `.aab` gerado pelo EAS Build
2. Aguarde processamento (alguns minutos)

**Passo 3: Notas de Versão**

**Notas de Versão (Português):**
```
Versão inicial do Beach Tennis Super 8.

Funcionalidades:
• Criação e gerenciamento de eventos
• Três formatos de torneio (Grupos + Finais, Pontos Corridos, Super 8 Rotativo)
• Geração automática de jogos
• Ranking em tempo real
• Funciona offline
```

**Notas de Versão (Inglês - opcional):**
```
Initial version of Beach Tennis Super 8.

Features:
• Create and manage events
• Three tournament formats (Groups + Finals, Round-Robin, Super 8 Rotating)
• Automatic game generation
• Real-time ranking
• Works offline
```

### 7.2 Diferença entre Testes e Produção

**Testes Internos:**
- Para testar antes de publicar
- Até 100 testadores
- Não aparece na Play Store pública

**Teste Fechado:**
- Para beta testers
- Link de acesso necessário
- Não aparece na Play Store pública

**Teste Aberto:**
- Beta pública
- Qualquer um pode participar
- Aparece na Play Store (como beta)

**Produção:**
- Versão pública final
- Aparece para todos na Play Store
- ⚠️ **Esta é a versão que você quer publicar**

### 7.3 Processo de Revisão da Google

**Prazos Médios:**
- **Primeira publicação:** 1-7 dias
- **Atualizações:** 1-3 dias
- **Apps com problemas:** Pode levar mais tempo

**O que a Google revisa:**
- ✅ Conformidade com políticas
- ✅ Funcionalidade do app
- ✅ Política de privacidade
- ✅ Declaração de dados
- ✅ Conteúdo apropriado
- ✅ Permissões justificadas

**Status Possíveis:**
- ✅ **Aprovado:** App publicado
- ⚠️ **Rejeitado:** Correções necessárias
- 🔄 **Em análise:** Aguardando revisão

### 7.4 Como Agir em Caso de Reprovação

**Se o app for rejeitado:**

1. **Ler o feedback completo** no Play Console
2. **Identificar o problema específico**
3. **Corrigir o problema**
4. **Reenviar para revisão**

**Problemas Comuns e Soluções:**

**Problema:** Política de privacidade ausente
- **Solução:** Criar e adicionar política

**Problema:** Declaração de dados incorreta
- **Solução:** Corrigir declarações no Play Console

**Problema:** Funcionalidade quebrada
- **Solução:** Testar e corrigir bugs, reenviar build

**Problema:** Conteúdo inadequado
- **Solução:** Revisar e remover conteúdo inadequado

### 7.5 Como Interpretar Feedback da Play Console

**Mensagens Comuns:**

**"Seu app precisa de uma política de privacidade"**
- ✅ Criar política e adicionar link

**"Declaração de dados incompleta"**
- ✅ Revisar e completar declarações

**"Permissão não justificada"**
- ✅ Remover permissão ou justificar uso

**"Conteúdo inadequado"**
- ✅ Revisar screenshots, descrição, ícone

### 7.6 Checklist de Publicação

- [ ] AAB gerado e testado
- [ ] Release de produção criada
- [ ] AAB enviado para produção
- [ ] Notas de versão preenchidas
- [ ] Store Listing completa
- [ ] Política de privacidade adicionada
- [ ] Declaração de dados completa
- [ ] App enviado para revisão
- [ ] Aguardando aprovação

---

## 8️⃣ Pós-Publicação

### 8.1 Monitoramento de Crashes

**Ferramentas Recomendadas:**
- **Expo:** Não inclui crash reporting por padrão
- **Sentry (Futuro):** Integração possível com `@sentry/react-native`
- **Firebase Crashlytics (Futuro):** Integração possível

**Para MVP:**
- ✅ Monitorar feedback de usuários na Play Store
- ✅ Testar app em diferentes dispositivos
- ✅ Manter versão de desenvolvimento para testes

### 8.2 Feedback de Usuários

**Onde Monitorar:**
- ✅ Play Console > Avaliações e comentários
- ✅ E-mail de contato (se configurado)
- ✅ Redes sociais (se houver)

**Como Responder:**
- ✅ Responder a todos os comentários (especialmente negativos)
- ✅ Ser profissional e educado
- ✅ Oferecer ajuda quando possível
- ✅ Agradecer feedback positivo

### 8.3 Atualizações Rápidas

**Processo de Atualização:**

1. **Corrigir problema/crash**
2. **Atualizar `versionCode` no `app.json`:**
   ```json
   {
     "expo": {
       "android": {
         "versionCode": 2
       },
       "version": "1.0.1"
     }
   }
   ```
3. **Gerar novo build:**
   ```bash
   eas build --platform android --profile production
   ```
4. **Upload no Play Console:**
   - Criar nova release
   - Adicionar notas de versão
   - Enviar para revisão

**⚠️ IMPORTANTE:**
- `versionCode` deve sempre aumentar
- `version` pode ser qualquer string (ex: "1.0.1", "1.1.0")

### 8.4 Controle de Versões

**Estratégia Recomendada:**

**Versionamento Semântico:**
- `MAJOR.MINOR.PATCH`
- Exemplo: `1.0.0` → `1.0.1` (patch) → `1.1.0` (minor) → `2.0.0` (major)

**Version Code:**
- Incrementar sempre: 1, 2, 3, 4...
- Nunca diminuir
- Nunca repetir

**Exemplo:**
```
Versão 1.0.0 → versionCode: 1
Versão 1.0.1 → versionCode: 2
Versão 1.1.0 → versionCode: 3
Versão 2.0.0 → versionCode: 4
```

### 8.5 Planejamento de Próximos Releases

**Funcionalidades Futuras (Baseado na Documentação):**
- Fase final para Grupos + Finais (semifinais e final)
- Exportação de dados
- Histórico de eventos
- Estatísticas avançadas
- Sincronização online (opcional)

**Roadmap Sugerido:**
- **v1.0.0:** MVP inicial (atual)
- **v1.1.0:** Melhorias de UX e correções
- **v1.2.0:** Fase final para Grupos + Finais
- **v1.3.0:** Exportação de dados
- **v2.0.0:** Sincronização online (se necessário)

### 8.6 Preparação Futura para iOS (Conceitual)

**⚠️ FORA DO ESCOPO ATUAL**, mas informações úteis:

**Diferenças Principais:**
- App Store requer processo diferente
- Necessita conta Apple Developer ($99/ano)
- Review mais rigoroso
- Requer Mac para builds locais (ou EAS Build)

**Quando Considerar iOS:**
- Após validação no Android
- Se houver demanda de usuários iOS
- Se fizer sentido para o negócio

### 8.7 Checklist Pós-Publicação

- [ ] App publicado e aprovado
- [ ] Monitoramento de crashes configurado (futuro)
- [ ] Processo de atualização documentado
- [ ] Estratégia de versionamento definida
- [ ] Roadmap de funcionalidades planejado
- [ ] Feedback de usuários sendo monitorado

---

## 📝 Resumo Executivo

### ✅ O Que Fazer Agora (Ordem de Execução)

1. **Ajustar `app.json`** - Adicionar `versionCode`
2. **Remover/Condicionar logs** - Usar `__DEV__`
3. **Criar Feature Graphic** - 1024x500 px
4. **Preparar Screenshots** - Mínimo 2, recomendado 4-8
5. **Criar Política de Privacidade** - Ver template separado
6. **Configurar EAS Build** - Instalar CLI e configurar
7. **Gerar Build de Produção** - AAB assinado
8. **Criar Conta Play Developer** - Pagar $25 USD
9. **Criar App no Play Console** - Preencher dados iniciais
10. **Configurar Store Listing** - Usar textos fornecidos
11. **Adicionar Política de Privacidade** - Link no Play Console
12. **Declarar Dados Coletados** - Preencher corretamente
13. **Upload do AAB** - Enviar para produção
14. **Aguardar Aprovação** - 1-7 dias
15. **Monitorar e Responder** - Feedback de usuários

### ⚠️ Pontos Críticos de Atenção

1. **Keystore:** Nunca perder credenciais (necessárias para atualizações)
2. **Política de Privacidade:** Obrigatória, deve estar acessível
3. **Declaração de Dados:** Deve ser precisa e honesta
4. **Version Code:** Sempre incrementar, nunca repetir
5. **Testes:** Testar app completamente antes de publicar

### 📞 Suporte e Recursos

**Documentação Oficial:**
- Expo: https://docs.expo.dev/
- Google Play: https://support.google.com/googleplay/android-developer
- EAS Build: https://docs.expo.dev/build/introduction/

**Comunidades:**
- Expo Discord: https://chat.expo.dev/
- Stack Overflow: Tag `expo` e `react-native`

---

**Documento criado em:** Dezembro 2024  
**Última atualização:** Dezembro 2024  
**Versão do Guia:** 1.0.0
