# Documentação Completa - Beach Tennis Super 8 MVP

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Funcionalidades Principais](#funcionalidades-principais)
3. [Formatos de Eventos](#formatos-de-eventos)
4. [Configurações e Customizações](#configurações-e-customizações)
5. [Regras de Negócio](#regras-de-negócio)
6. [Fluxos de Uso](#fluxos-de-uso)
7. [Estrutura de Dados](#estrutura-de-dados)
8. [Algoritmos e Cálculos](#algoritmos-e-cálculos)

---

## 🎯 Visão Geral

O **Beach Tennis Super 8** é um aplicativo mobile desenvolvido em React Native com Expo para gerenciar eventos e torneios de Beach Tennis. O MVP oferece três formatos diferentes de competição, gerenciamento completo de participantes, geração automática de jogos, registro de resultados e cálculo de ranking em tempo real.

### Stack Tecnológica

- **Framework:** React Native com Expo (SDK 51)
- **Linguagem:** TypeScript
- **Navegação:** Expo Router (file-based routing)
- **Estado:** Zustand
- **Banco de Dados:** SQLite (expo-sqlite) - offline-first
- **Testes:** Jest

---

## 🚀 Funcionalidades Principais

### 1. Gerenciamento de Eventos

#### 1.1 Criação de Eventos
- **Wizard em 4 etapas:**
  1. **Informações Básicas:**
     - Nome do evento (obrigatório, mínimo 3 caracteres)
     - Data (obrigatória, não pode ser no passado)
     - Hora de início (opcional, formato HH:MM)
     - Local (opcional)
     - Número de quadras (1 a 4, padrão: 1)
     - Número de sets por jogo (1 ou 2, padrão: 1)
  
  2. **Seleção de Formato:**
     - Grupos + Finais
     - Pontos Corridos (Round-Robin)
     - Super 8 Rotativo
     - Modal informativo (ℹ️) para cada formato com explicações detalhadas
  
  3. **Configurações de Pontuação:**
     - Pontos por vitória (1 a 10, padrão: 1)
     - Critérios de desempate (apenas informativo, fixo)
  
  4. **Revisão Final:**
     - Exibe todas as informações configuradas
     - Permite voltar para editar qualquer etapa
     - Confirmação para criar o evento

#### 1.2 Listagem de Eventos
- Tela inicial (Home) exibe todos os eventos ativos
- Ordenação por data (mais recentes primeiro)
- Pull-to-refresh para atualizar lista
- Navegação direta para detalhes do evento

#### 1.3 Detalhes do Evento
- **4 Tabs principais:**
  - **Agenda:** Visualização e gerenciamento de jogos
  - **Ranking:** Tabela de classificação em tempo real
  - **Participantes:** Gerenciamento de jogadores e duplas
  - **Configurações:** Informações do evento e exclusão

#### 1.4 Exclusão de Eventos
- Disponível na tab Configurações
- Confirmação obrigatória antes de excluir
- Exclusão em cascata (remove participantes e jogos relacionados)

---

### 2. Gerenciamento de Participantes

#### 2.1 Cadastro de Jogadores
- **Adicionar jogador individual:**
  - Nome (obrigatório, mínimo 2 caracteres)
  - Validação em tempo real
  
- **Entrada rápida (Quick Add):**
  - Colar lista de nomes (um por linha)
  - Cria múltiplos jogadores de uma vez
  - Validação automática de nomes

#### 2.2 Formação de Duplas
- **Formação Manual:**
  - Selecionar 2 jogadores individuais
  - Validação: jogadores não podem já estar em duplas
  - Confirmação antes de formar
  
- **Formação Automática:**
  - Forma todas as duplas possíveis aleatoriamente
  - Requer número par de jogadores
  - Mensagem informativa se número ímpar

#### 2.3 Edição de Duplas
- Editar duplas existentes (apenas antes de gerar jogos)
- Remover participantes (apenas antes de gerar jogos)
- Visualização de duplas formadas

#### 2.4 Validações por Formato
- **Super 8 Rotativo:**
  - Requer exatamente 8 jogadores individuais
  - Não permite formação de duplas
  
- **Grupos + Finais / Pontos Corridos:**
  - Requer exatamente 8 duplas completas (16 jogadores)
  - Mensagens contextuais sobre requisitos

#### 2.5 Bloqueio de Alterações
- **Regra crítica:** Após gerar os jogos, não é possível:
  - Adicionar novos participantes
  - Remover participantes existentes
  - Editar ou reformar duplas
- Interface bloqueia ações e exibe mensagem informativa

---

### 3. Geração de Jogos

#### 3.1 Geração Automática
- Botão "Gerar Jogos" aparece quando requisitos são atendidos
- Validação inteligente baseada no formato:
  - **Rotativo:** 8 jogadores individuais
  - **Grupos/Round-Robin:** 8 duplas completas
- Disponível nas tabs Agenda e Participantes

#### 3.2 Algoritmos de Geração

**Grupos + Finais:**
- Divide 8 duplas em 2 grupos (A e B) com 4 duplas cada
- Gera todos os confrontos dentro de cada grupo (round-robin)
- Total: 12 jogos na fase de grupos (6 por grupo)
- Organiza em rodadas respeitando número de quadras
- Fase final (semifinais e final) será gerada posteriormente

**Pontos Corridos (Round-Robin):**
- Gera todos os confrontos possíveis entre 8 duplas
- Fórmula: 8 × 7 ÷ 2 = 28 jogos
- Organiza em rodadas usando método de rotação circular
- Respeita número de quadras disponíveis

**Super 8 Rotativo:**
- Forma duplas automaticamente a cada rodada
- Algoritmo minimiza repetição de parceiros e adversários
- Cada rodada: 4 duplas, 2 jogos simultâneos
- Default: 4 rodadas (configurável)
- Ranking é individual, não por dupla

#### 3.3 Organização em Rodadas
- Jogos organizados automaticamente em rodadas
- Respeita número de quadras configurado
- Garante que uma dupla não jogue dois jogos simultaneamente
- Atribuição automática de quadras quando disponível

---

### 4. Agenda de Jogos

#### 4.1 Visualização
- Jogos organizados por rodada
- Cards de jogo mostram:
  - Quadra (ou "Sem quadra")
  - Status (Pendente/Finalizado)
  - Duplas participantes
  - Placar (se finalizado)
- Filtros:
  - Todos
  - Pendentes
  - Finalizados

#### 4.2 Registro de Resultados
- Toque no card do jogo para registrar resultado
- Modal com campos de placar:
  - 1º Set (obrigatório)
  - 2º Set (apenas se evento configurado para 2 sets)
- Validações:
  - Apenas números inteiros
  - Valores não-negativos
  - Pelo menos um placar preenchido
- Determinação automática do vencedor:
  - **1 set:** Quem tem mais pontos vence
  - **2 sets:** Quem ganhou mais sets vence
- Atualização automática do ranking após salvar

#### 4.3 Edição de Resultados
- Mesmo modal usado para registrar e editar
- Permite alterar placares de jogos finalizados
- Recalcula ranking automaticamente

---

### 5. Ranking

#### 5.1 Cálculo de Pontos
- **Fórmula:** Pontos = Vitórias × Pontos por Vitória
- Exemplo: Se `points_per_win = 3` e participante tem 2 vitórias → 6 pontos

#### 5.2 Critérios de Desempate (Ordem Fixa)
1. **Pontos totais** (sempre primeiro critério)
2. Vitórias
3. Saldo de games (games pró - games contra)
4. Games pró
5. Confronto direto

#### 5.3 Exibição
- Tabela com colunas:
  - **#** (Posição)
  - **Participante** (Nome ou dupla)
  - **P** (Pontos)
  - **V** (Vitórias)
  - **D** (Derrotas)
  - **SG** (Saldo de Games)
- Atualização em tempo real
- Destaque visual para top 3
- Ranking individual para formato Rotativo
- Ranking por duplas para outros formatos

#### 5.4 Compartilhamento
- Botão para compartilhar ranking
- Usa Share API nativa do dispositivo
- Formato texto formatado

---

### 6. Configurações do Evento

#### 6.1 Visualização
- Formato do evento
- Número de quadras
- Sets por jogo
- Pontos por vitória
- Critérios de desempate (informativo)

#### 6.2 Exclusão
- Botão para excluir evento
- Confirmação obrigatória
- Ação irreversível
- Remove todos os dados relacionados

---

## 🎮 Formatos de Eventos

### 1. Grupos + Finais

**Conceito:**
- 8 duplas fixas divididas em 2 grupos
- Fase de grupos seguida de fase final (semifinais + final)

**Estrutura:**
- 2 grupos com 4 duplas cada
- Cada grupo: sistema "todos contra todos"
- Total: 12 jogos na fase de grupos (6 por grupo)

**Classificação:**
- Classificam para semifinais: 1º e 2º de cada grupo
- Semifinais: 1º Grupo A x 2º Grupo B | 1º Grupo B x 2º Grupo A
- Final: Vencedores das semifinais

**Requisitos:**
- 8 duplas completas (16 jogadores)

**Critérios de Desempate:**
1. Pontos totais
2. Vitórias
3. Saldo de games
4. Games pró
5. Confronto direto
6. Sorteio

---

### 2. Pontos Corridos (Round-Robin)

**Conceito:**
- 8 duplas fixas jogam todas contra todas
- Não há grupos nem fases finais

**Estrutura:**
- Sistema Round-Robin completo
- Cada dupla joga contra as outras 7 duplas
- Total: 28 jogos (fórmula: 8 × 7 ÷ 2)

**Classificação:**
- Ranking único com todas as 8 duplas
- A dupla com maior pontuação é a campeã
- Não há mata-mata

**Requisitos:**
- 8 duplas completas (16 jogadores)

**Critérios de Desempate:**
1. Pontos totais
2. Vitórias
3. Saldo de games
4. Games pró
5. Confronto direto
6. Sorteio

---

### 3. Super 8 Rotativo

**Conceito:**
- 8 jogadores individuais (não duplas fixas)
- Duplas mudam a cada rodada
- Ranking é individual

**Estrutura:**
- Cada rodada: 4 duplas formadas
- Duplas reorganizadas a cada rodada
- Algoritmo minimiza repetição de parceiros e adversários
- Default: 4 rodadas

**Classificação:**
- Ranking individual (não por dupla)
- Cada jogador acumula: Vitórias, Games pró/contra, Saldo
- Pontuação: Vitória = pontos configurados para cada jogador da dupla vencedora

**Requisitos:**
- 8 jogadores individuais (sem formar duplas)

**Critérios de Desempate:**
1. Pontos totais
2. Vitórias
3. Saldo de games
4. Games pró
5. Sorteio

**Características Especiais:**
- Duplas formadas automaticamente pelo sistema
- Cada jogador joga com parceiros diferentes ao longo do torneio
- Algoritmo busca equilíbrio entre todos os jogadores

---

## ⚙️ Configurações e Customizações

### Configurações do Evento

#### 1. Número de Quadras
- **Range:** 1 a 4
- **Padrão:** 1
- **Uso:** Organização de jogos simultâneos
- **Configuração:** Durante criação do evento

#### 2. Número de Sets por Jogo
- **Opções:** 1 ou 2 sets
- **Padrão:** 1 set
- **Impacto:**
  - Modal de resultado mostra campos conforme configuração
  - Determinação de vencedor adaptada
  - Exibição de placares ajustada
- **Configuração:** Durante criação do evento

#### 3. Pontos por Vitória
- **Range:** 1 a 10
- **Padrão:** 1 ponto
- **Impacto:**
  - Cálculo de pontos no ranking
  - Fórmula: Pontos = Vitórias × Pontos por Vitória
- **Configuração:** Durante criação do evento (step 3)

#### 4. Critérios de Desempate
- **Status:** Fixo e único para todos os eventos
- **Não configurável:** Apenas exibido como informação
- **Ordem:**
  1. Pontos totais (sempre primeiro)
  2. Vitórias
  3. Saldo de games
  4. Games pró
  5. Confronto direto
- **Exibição:** Informativa nas telas de criação e configurações

#### 5. Duração do Jogo
- **Padrão:** 30 minutos
- **Uso:** Planejamento de agenda (futuro)
- **Configuração:** Automática (não editável no MVP)

---

## 📜 Regras de Negócio

### Regras Críticas

#### 1. Bloqueio de Alteração de Participantes
**Regra:** Após gerar os jogos, não é possível alterar participantes em nenhum formato.

**Aplicação:**
- Não é possível adicionar novos participantes
- Não é possível remover participantes existentes
- Não é possível editar ou reformar duplas
- Interface bloqueia todas essas ações
- Mensagem informativa é exibida

**Justificativa:** Garante integridade dos dados e consistência do ranking e agenda.

---

#### 2. Validação de Geração de Jogos

**Super 8 Rotativo:**
- Requer exatamente 8 jogadores individuais
- Não permite formação de duplas antes da geração
- Botão "Gerar Jogos" só aparece quando há 8 jogadores individuais

**Grupos + Finais / Pontos Corridos:**
- Requer exatamente 8 duplas completas (16 jogadores)
- Botão "Gerar Jogos" só aparece quando há 8 duplas formadas
- Mensagens contextuais orientam o usuário

---

#### 3. Registro de Resultados

**Validações:**
- Apenas números inteiros são aceitos
- Valores não podem ser negativos
- Pelo menos um placar deve ser preenchido
- Número de sets respeita configuração do evento

**Determinação de Vencedor:**
- **1 set:** Quem tem mais pontos no set vence
- **2 sets:** Quem ganhou mais sets vence
- Em caso de empate, nenhum vencedor é atribuído

---

#### 4. Cálculo de Ranking

**Pontos:**
- Calculados como: Vitórias × Pontos por Vitória
- Sempre o primeiro critério de ordenação

**Games:**
- Soma de todos os games de todos os sets
- Games pró: total de games marcados
- Games contra: total de games recebidos
- Saldo: Games pró - Games contra

**Critérios de Desempate:**
- Aplicados na ordem fixa definida
- Se todos os critérios empatarem, posição é mantida

---

#### 5. Integridade de Dados

**Regras:**
- Não é possível refazer a agenda após gerar jogos
- Não é possível editar jogos finalizados (removido no MVP)
- Resultados podem ser editados a qualquer momento
- Ranking é recalculado automaticamente após cada alteração

---

## 🔄 Fluxos de Uso

### Fluxo 1: Criar e Gerenciar Evento Completo

1. **Criar Evento:**
   - Preencher informações básicas
   - Selecionar formato
   - Configurar pontuação
   - Revisar e criar

2. **Adicionar Participantes:**
   - Adicionar jogadores individuais
   - Ou usar entrada rápida
   - Formar duplas (se necessário para o formato)

3. **Gerar Jogos:**
   - Aguardar requisitos serem atendidos
   - Clicar em "Gerar Jogos"
   - Jogos são criados automaticamente

4. **Registrar Resultados:**
   - Abrir tab Agenda
   - Tocar em jogo pendente
   - Inserir placares
   - Salvar

5. **Acompanhar Ranking:**
   - Abrir tab Ranking
   - Visualizar classificação atualizada
   - Compartilhar se desejar

---

### Fluxo 2: Formato Rotativo

1. **Criar Evento:**
   - Selecionar "Super 8 Rotativo"
   - Configurar demais opções

2. **Adicionar 8 Jogadores:**
   - Adicionar jogadores individuais
   - **Não formar duplas**

3. **Gerar Jogos:**
   - Sistema forma duplas automaticamente
   - Gera rodadas rotativas

4. **Registrar Resultados:**
   - Cada vitória conta para os jogadores individuais
   - Ranking é individual

---

### Fluxo 3: Formato com Duplas

1. **Criar Evento:**
   - Selecionar "Grupos + Finais" ou "Pontos Corridos"
   - Configurar demais opções

2. **Adicionar 16 Jogadores:**
   - Adicionar jogadores individuais
   - Formar 8 duplas (manual ou automática)

3. **Gerar Jogos:**
   - Sistema gera todos os confrontos
   - Organiza em rodadas

4. **Registrar Resultados:**
   - Cada vitória conta para a dupla
   - Ranking é por duplas

---

## 💾 Estrutura de Dados

### Entidades Principais

#### Player (Jogador)
```typescript
{
  id: number
  name: string
  nickname?: string
  contact?: string
  level?: 'beginner' | 'intermediate' | 'advanced' | 'professional'
  avatar_uri?: string
  created_at: number
  updated_at: number
}
```

#### Event (Evento)
```typescript
{
  id: number
  name: string
  date: number
  start_time?: string  // HH:MM format
  location?: string
  category?: PlayerLevel
  format: 'groups_finals' | 'round_robin' | 'rotating'
  num_courts: number
  num_sets: number
  game_duration_minutes: number
  points_per_win: number
  tiebreak_criteria: string[]  // JSON array
  status: 'active' | 'finished' | 'archived'
  created_at: number
  updated_at: number
}
```

#### EventParticipant (Participante do Evento)
```typescript
{
  id: number
  event_id: number
  player1_id: number
  player2_id?: number  // NULL para formato rotativo
  team_name?: string
  created_at: number
}
```

#### Match (Jogo)
```typescript
{
  id: number
  event_id: number
  round: number
  court?: number
  team1_id: number
  team2_id: number
  status: 'pending' | 'finished'
  score_team1_set1?: number
  score_team2_set1?: number
  score_team1_set2?: number
  score_team2_set2?: number
  score_team1_set3?: number
  score_team2_set3?: number
  winner_id?: number
  scheduled_time?: number
  started_at?: number
  finished_at?: number
  created_at: number
  updated_at: number
}
```

#### RankingEntry (Entrada do Ranking)
```typescript
{
  position: number
  participant: EventParticipant
  wins: number
  losses: number
  points: number
  gamesFor: number
  gamesAgainst: number
  gameDifference: number
}
```

---

## 🧮 Algoritmos e Cálculos

### 1. Geração de Jogos - Grupos + Finais

**Algoritmo:**
1. Divide 8 duplas em 2 grupos (A e B) aleatoriamente
2. Para cada grupo, gera todos os confrontos (round-robin)
3. Organiza jogos em rodadas respeitando número de quadras
4. Garante que uma dupla não jogue dois jogos simultaneamente

**Total de Jogos:** 12 (fase de grupos)

---

### 2. Geração de Jogos - Round-Robin

**Algoritmo:**
1. Gera todos os confrontos possíveis: n × (n-1) ÷ 2
2. Para 8 duplas: 8 × 7 ÷ 2 = 28 jogos
3. Organiza em rodadas usando método de rotação circular
4. Respeita número de quadras disponíveis

**Total de Jogos:** 28

---

### 3. Geração de Jogos - Rotativo

**Algoritmo:**
1. Para cada rodada:
   - Forma 4 duplas a partir de 8 jogadores
   - Minimiza repetição de parceiros (matriz de parceiros)
   - Minimiza repetição de adversários (matriz de adversários)
   - Cria 2 jogos simultâneos (4 duplas)
2. Repete para número de rodadas configurado (default: 4)

**Total de Jogos:** 4 rodadas × 2 jogos = 8 jogos (default)

---

### 4. Cálculo de Ranking

**Para Formatos com Duplas:**
1. Para cada partida finalizada:
   - Calcula games totais (soma de todos os sets)
   - Atribui vitória/derrota
   - Adiciona pontos (vitórias × points_per_win)
   - Registra confronto direto
2. Calcula estatísticas:
   - Games pró, games contra, saldo
3. Ordena por:
   - Pontos (decrescente)
   - Vitórias (decrescente)
   - Saldo de games (decrescente)
   - Games pró (decrescente)
   - Confronto direto

**Para Formato Rotativo:**
1. Para cada partida finalizada:
   - Identifica jogadores individuais das duplas
   - Atribui vitória/derrota para cada jogador individual
   - Adiciona pontos para cada jogador vencedor
   - Atribui games completos para cada jogador (não divide)
2. Calcula estatísticas por jogador individual
3. Ordena usando mesmos critérios

---

### 5. Cálculo de Games

**Fórmula:**
```
Games Totais = Set1 + Set2 + Set3 (se houver)
```

**Exemplo:**
- Set 1: 6-4
- Set 2: 6-3
- Total Team 1: 12 games
- Total Team 2: 7 games

---

## 📱 Interface e UX

### Telas Principais

1. **Home (Lista de Eventos)**
   - Lista de eventos ativos
   - Botão para criar novo evento
   - Pull-to-refresh

2. **Criar Evento (Wizard)**
   - 4 etapas com navegação entre elas
   - Validação em tempo real
   - Modal informativo para formatos

3. **Detalhes do Evento**
   - 4 tabs principais
   - Navegação por tabs
   - Pull-to-refresh em todas as tabs

### Feedback Visual

- **Loading states:** Indicadores de carregamento
- **Mensagens de erro:** Alertas claros e informativos
- **Validações:** Feedback imediato em formulários
- **Confirmações:** Para ações destrutivas
- **Mensagens contextuais:** Orientam o usuário sobre próximos passos

### Acessibilidade

- Textos descritivos
- Botões com tamanho adequado
- Contraste de cores adequado
- Feedback visual claro

---

## 🔒 Limitações e Restrições

### Limitações do MVP

1. **Não é possível:**
   - Editar informações do evento após criação
   - Refazer agenda após gerar jogos
   - Alterar participantes após gerar jogos
   - Configurar critérios de desempate (são fixos)
   - Editar jogos (removido do MVP)

2. **Funcionalidades Futuras:**
   - Fase final para Grupos + Finais (semifinais e final)
   - Exportação de dados
   - Histórico de eventos
   - Estatísticas avançadas
   - Sincronização online

---

## 📊 Validações e Regras de Validação

### Validações de Formulários

**Nome do Evento:**
- Obrigatório
- Mínimo 3 caracteres
- Validação em tempo real

**Data:**
- Obrigatória
- Não pode ser no passado
- Formato: DD/MM/YYYY

**Hora:**
- Opcional
- Formato: HH:MM
- Validação de formato

**Nome do Jogador:**
- Obrigatório
- Mínimo 2 caracteres

**Placar:**
- Apenas números inteiros
- Não-negativos
- Pelo menos um placar preenchido

**Quadra:**
- Opcional
- Se preenchida: entre 1 e número de quadras do evento

**Rodada:**
- Obrigatória
- Número maior que zero

---

## 🎯 Casos de Uso Principais

1. **Organizador cria evento e gerencia torneio completo**
2. **Jogador visualiza seus jogos e resultados**
3. **Organizador registra resultados em tempo real**
4. **Participantes acompanham ranking atualizado**
5. **Organizador compartilha ranking com participantes**

---

## 📝 Notas Técnicas

### Persistência
- Todos os dados são salvos localmente (SQLite)
- Funciona offline
- Dados persistem entre sessões

### Performance
- Cálculo de ranking otimizado
- Geração de jogos eficiente
- Interface responsiva

### Testes
- Testes unitários para algoritmos
- Cobertura de lógica de negócio crítica
- Testes de cálculo de ranking

---

## 🔄 Atualizações e Versões

### Versão MVP Atual
- Todas as funcionalidades básicas implementadas
- Três formatos de evento funcionais
- Geração automática de jogos
- Ranking em tempo real
- Interface completa e funcional

---

**Documento atualizado em:** Dezembro 2024  
**Versão do MVP:** 1.0.0
