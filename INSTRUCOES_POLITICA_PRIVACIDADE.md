# 📝 Instruções para Personalizar a Política de Privacidade

## ⚠️ Ações Necessárias

Antes de usar a política de privacidade, você precisa personalizar as seguintes informações:

### 1. Informações de Contato

No arquivo `POLITICA_PRIVACIDADE.md`, localize a seção 10 (Contato) e substitua:

```markdown
**E-mail:** [SEU_EMAIL_AQUI]  
**Site:** [SEU_SITE_AQUI]
```

**Por:**
```markdown
**E-mail:** seu-email@exemplo.com  
**Site:** https://seu-site.com
```

### 2. Hospedar a Política

A política de privacidade **deve estar acessível via URL pública**. Opções:

#### Opção 1: GitHub Pages (Recomendado - Gratuito)

1. Crie um repositório no GitHub (ex: `beach-tennis-super8-privacy`)
2. Faça upload do arquivo `POLITICA_PRIVACIDADE.md`
3. Ative GitHub Pages nas configurações do repositório
4. A URL será: `https://seu-usuario.github.io/beach-tennis-super8-privacy/POLITICA_PRIVACIDADE`

**Ou converta para HTML:**
- Use um conversor Markdown para HTML
- Faça upload do HTML
- A URL será: `https://seu-usuario.github.io/beach-tennis-super8-privacy/`

#### Opção 2: Netlify (Gratuito)

1. Crie conta no Netlify
2. Faça upload do arquivo Markdown ou HTML
3. Netlify gera URL automaticamente

#### Opção 3: Vercel (Gratuito)

1. Crie conta no Vercel
2. Faça upload do arquivo
3. Vercel gera URL automaticamente

#### Opção 4: Site Próprio

Se você já tem um site, faça upload da política lá.

### 3. Converter Markdown para HTML (Opcional)

A Play Store aceita tanto Markdown quanto HTML, mas HTML é mais compatível.

**Ferramentas online:**
- https://www.markdowntohtml.com/
- https://dillinger.io/
- https://stackedit.io/

**Ou use Pandoc (CLI):**
```bash
pandoc POLITICA_PRIVACIDADE.md -o politica-privacidade.html
```

### 4. Adicionar Link no Play Console

1. Acesse Play Console
2. Vá em "Política, privacidade e segurança"
3. Cole a URL da política de privacidade
4. Salve

---

## ✅ Checklist de Personalização

- [ ] E-mail de contato atualizado na política
- [ ] Site de contato atualizado na política
- [ ] Política hospedada em URL pública
- [ ] URL testada e acessível
- [ ] Política convertida para HTML (opcional, mas recomendado)
- [ ] Link adicionado no Play Console

---

## 📋 Exemplo de URL Final

Após hospedar, a URL deve ser algo como:
- `https://seu-usuario.github.io/beach-tennis-super8-privacy/`
- `https://beach-tennis-super8.netlify.app/politica-privacidade`
- `https://seusite.com/politica-privacidade`

---

## ⚠️ Importante

- A política **deve estar acessível** antes de enviar o app para revisão
- A URL **não pode retornar erro 404**
- A política **deve estar em português** (ou no idioma do app)
- A política **deve ser atualizada** se houver mudanças no app

---

**Última atualização:** Dezembro 2024
