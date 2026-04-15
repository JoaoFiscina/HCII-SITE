# Atlas Cirúrgico de Bolso

Projeto front-end em `HTML`, `CSS` e `JavaScript` puro para estudo de procedimentos e habilidades cirúrgicas. Os dados do app ficam em um arquivo externo chamado [procedimentos.json](/C:/GITHUB/GITS/HCII%20SITE/procedimentos.json).

## Como adicionar um novo procedimento

Cada item deve ser inserido dentro do array `"procedimentos"` com a estrutura abaixo:

```json
{
  "id": "nome_unico_sem_espacos",
  "nome": "Nome do procedimento",
  "categoria": "Especialidade / Grupo",
  "descricao_curta": "Resumo curto do objetivo do roteiro.",
  "indicacoes": ["Item 1", "Item 2"],
  "contraindicacoes": ["Item 1"],
  "preparo": ["Item 1", "Item 2"],
  "materiais": ["Item 1", "Item 2"],
  "acoes_iniciais": ["Item 1", "Item 2"],
  "passos": [
    {
      "numero": 1,
      "titulo": "Nome do passo",
      "descricao": "Explicação do passo.",
      "critico": true,
      "alerta": "Mensagem opcional de atenção.",
      "imagem": "URL opcional ou data URI"
    }
  ],
  "observacoes_finais": ["Item 1"],
  "referencias": ["Fonte 1"],
  "imagem_capa": "URL opcional ou data URI"
}
```

## Como marcar uma etapa como crítica

Dentro de cada objeto de `passos`, use:

```json
"critico": true
```

Quando esse campo estiver como `true`, a etapa será destacada visualmente no modo estudo e no modo sequência.

## Como adicionar imagem opcional

Você pode informar:

- Uma URL de imagem válida.
- Uma `data URI` (`data:image/...`) para embutir a imagem diretamente no JSON.

Campos aceitos:

- `imagem_capa`: imagem principal do procedimento.
- `imagem`: imagem opcional de um passo específico.

Se esses campos estiverem vazios, o app continua funcionando normalmente.

## Como rodar localmente

### Opção 1: abrir diretamente

Abra [index.html](/C:/GITHUB/GITS/HCII%20SITE/index.html) no navegador.

Observação: alguns navegadores bloqueiam o carregamento automático de `procedimentos.json` quando o arquivo é aberto via `file://`. Se isso acontecer, use o botão **Importar JSON** ou rode com um servidor local simples.

### Opção 2: usar um servidor local simples

Se tiver Python instalado:

```bash
python -m http.server 8000
```

Depois abra:

```text
http://localhost:8000
```

## Arquivos principais

- [index.html](/C:/GITHUB/GITS/HCII%20SITE/index.html): estrutura da interface.
- [styles.css](/C:/GITHUB/GITS/HCII%20SITE/styles.css): visual responsivo e componentes.
- [script.js](/C:/GITHUB/GITS/HCII%20SITE/script.js): carregamento do JSON, filtros, modos e persistência no `localStorage`.
- [procedimentos.json](/C:/GITHUB/GITS/HCII%20SITE/procedimentos.json): base de dados editável.
