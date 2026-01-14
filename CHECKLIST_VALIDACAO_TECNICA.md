# ✅ Checklist de Validação Técnica - Pré-Publicação

**App:** Beach Tennis Super 8  
**Versão:** 1.0.0  
**Data:** Dezembro 2024

---

## 📱 Configurações do App

### app.json
- [x] `name` configurado: "Beach Tennis Super 8"
- [x] `slug` configurado: "beach-tennis-super8"
- [x] `version` configurado: "1.0.0"
- [x] `package` configurado: "com.beachtennissuper8.app"
- [x] `versionCode` adicionado: 1
- [x] `permissions` vazio (sem permissões desnecessárias)
- [x] `icon` configurado: "./assets/icon.png"
- [x] `adaptiveIcon` configurado
- [x] `splash` configurado

### Versões do SDK
- [x] Expo SDK 51 (atual)
- [x] minSdkVersion: 23 (gerenciado pelo Expo)
- [x] targetSdkVersion: 34 (gerenciado pelo Expo)
- [x] compileSdkVersion: 34 (gerenciado pelo Expo)

---

## 🔍 Logs e Debug

### Console Logs
- [x] `console.log` condicionados com `__DEV__` em `src/db/init.ts`
- [x] `console.warn` condicionados com `__DEV__` em `src/db/database.ts` (4 ocorrências)
- [x] `console.error` condicionados com `__DEV__` em `src/db/init.ts`
- [ ] Verificar se há outros `console.*` no código (usar grep)

### Flags de Debug
- [x] Nenhuma flag de debug hardcoded
- [x] Nenhuma URL de desenvolvimento exposta
- [x] Nenhuma chave de API de desenvolvimento

---

## 🎨 Assets Visuais

### Ícone
- [ ] Ícone 512x512 px existe em `./assets/icon.png`
- [ ] Ícone sem transparência (Android)
- [ ] Ícone testado visualmente

### Adaptive Icon
- [ ] Foreground image existe em `./assets/adaptive-icon.png`
- [ ] Background color configurado: "#ffffff"
- [ ] Testado em diferentes dispositivos Android

### Splash Screen
- [ ] Splash image existe em `./assets/splash.png`
- [ ] Background color configurado: "#ffffff"
- [ ] Testado visualmente

### Feature Graphic (Para Play Store)
- [ ] Feature graphic 1024x500 px criado
- [ ] Feature graphic salvo em local acessível
- [ ] Feature graphic testado visualmente

### Screenshots (Para Play Store)
- [ ] Mínimo 2 screenshots preparados
- [ ] Screenshots em formato PNG ou JPEG
- [ ] Screenshots sem texto, bordas ou sobreposições
- [ ] Screenshots testados em diferentes resoluções

---

## 🔐 Assinatura e Build

### EAS Build
- [ ] EAS CLI instalado globalmente
- [ ] Login no Expo realizado (`eas login`)
- [ ] `eas.json` configurado (usar `eas.json.example` como base)
- [ ] Build de produção testada localmente (se possível)

### Keystore
- [ ] Keystore será gerado automaticamente pelo EAS (primeira build)
- [ ] Plano de backup das credenciais do keystore definido
- [ ] Credenciais serão salvas em local seguro

### Android App Bundle (AAB)
- [ ] AAB gerado com sucesso
- [ ] AAB testado em dispositivo físico (se possível)
- [ ] Tamanho do AAB verificado (não excessivamente grande)
- [ ] AAB pronto para upload na Play Store

---

## 🧪 Testes

### Funcionalidades Principais
- [ ] Criação de evento funciona
- [ ] Adição de participantes funciona
- [ ] Formação de duplas funciona
- [ ] Geração de jogos funciona (todos os 3 formatos)
- [ ] Registro de resultados funciona
- [ ] Ranking é calculado corretamente
- [ ] Compartilhamento funciona

### Formatos de Evento
- [ ] Formato "Grupos + Finais" funciona
- [ ] Formato "Pontos Corridos" funciona
- [ ] Formato "Super 8 Rotativo" funciona

### Validações
- [ ] Validações de formulários funcionam
- [ ] Mensagens de erro são claras
- [ ] Bloqueios de alteração funcionam (após gerar jogos)

### Performance
- [ ] App não trava ou trava raramente
- [ ] Tempo de carregamento aceitável
- [ ] Uso de memória razoável
- [ ] Funciona em dispositivos com Android 6.0+

### Offline
- [ ] App funciona sem internet
- [ ] Dados são salvos localmente
- [ ] Dados persistem após fechar app

---

## 📋 Play Store - Preparação

### Conta Google Play Developer
- [ ] Conta criada
- [ ] Taxa de $25 USD paga
- [ ] Perfil do desenvolvedor completo
- [ ] E-mail de contato configurado
- [ ] Site configurado e acessível

### Criação do App
- [ ] App criado no Play Console
- [ ] Nome do app: "Beach Tennis Super 8"
- [ ] Idioma padrão: Português (Brasil)
- [ ] Categoria: Esportes
- [ ] Público-alvo: Todos
- [ ] Classificação indicativa preenchida
- [ ] Declaração de anúncios: Não contém anúncios

### Store Listing
- [ ] Nome do aplicativo preenchido
- [ ] Descrição curta (80 caracteres) preenchida
- [ ] Descrição completa preenchida
- [ ] Feature graphic adicionado
- [ ] Mínimo 2 screenshots adicionados
- [ ] Adaptive icon configurado

### Política de Privacidade
- [ ] Política de privacidade criada
- [ ] Política hospedada em local acessível (GitHub Pages, site, etc.)
- [ ] Link da política adicionado no Play Console
- [ ] Política revisada e completa

### Declaração de Dados
- [ ] Declaração de dados preenchida no Play Console
- [ ] Apenas dados realmente coletados declarados
- [ ] Justificativas adequadas fornecidas

---

## 🚨 Validações Finais

### Antes de Enviar para Revisão
- [ ] Todos os itens acima marcados
- [ ] App testado completamente
- [ ] Nenhum log sensível exposto
- [ ] Nenhuma funcionalidade quebrada
- [ ] Store Listing completa e profissional
- [ ] Política de privacidade acessível
- [ ] Declaração de dados correta

### Checklist de Segurança
- [ ] Nenhuma chave de API hardcoded
- [ ] Nenhuma senha ou credencial exposta
- [ ] Nenhum endpoint de desenvolvimento exposto
- [ ] Nenhum dado sensível em logs

### Checklist de Conformidade
- [ ] Conformidade com políticas Google Play
- [ ] Conformidade com LGPD
- [ ] Política de privacidade adequada
- [ ] Declaração de dados precisa

---

## 📝 Notas

**Data de Validação:** _______________

**Validador:** _______________

**Observações:**
- 
- 
- 

---

## ✅ Aprovação Final

- [ ] **APROVADO PARA PUBLICAÇÃO**

**Assinatura:** _______________  
**Data:** _______________

---

**Última atualização:** Dezembro 2024
