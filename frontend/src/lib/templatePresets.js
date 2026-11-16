export const TEMPLATE_PRESETS = [
  {
    "name": "Aventura clássica",
    "system": "dnd5e",
    "description": "Base de ficha para aventuras de fantasia. Personalize as regras para sua mesa.",
    "attributes_schema": [
      {
        "key": "str",
        "label": "Força"
      },
      {
        "key": "dex",
        "label": "Destreza"
      },
      {
        "key": "con",
        "label": "Constituição"
      },
      {
        "key": "int",
        "label": "Inteligência"
      },
      {
        "key": "wis",
        "label": "Sabedoria"
      },
      {
        "key": "cha",
        "label": "Carisma"
      }
    ],
    "skills_schema": [
      {
        "key": "athletics",
        "label": "Atletismo"
      },
      {
        "key": "stealth",
        "label": "Furtividade"
      },
      {
        "key": "perception",
        "label": "Percepção"
      },
      {
        "key": "arcana",
        "label": "Arcanismo"
      }
    ],
    "sections": [
      {
        "key": "journey",
        "label": "Jornada",
        "fields": [
          {
            "key": "ideal",
            "label": "Ideal",
            "type": "text"
          },
          {
            "key": "bond",
            "label": "Vínculo",
            "type": "text"
          },
          {
            "key": "inspiration",
            "label": "Inspiração",
            "type": "checkbox"
          }
        ]
      }
    ]
  },
  {
    "name": "Heróis de Arton",
    "system": "tormenta",
    "description": "Ponto de partida para Tormenta20, com devoção, origem e recursos personalizados.",
    "attributes_schema": [
      {
        "key": "for",
        "label": "Força"
      },
      {
        "key": "des",
        "label": "Destreza"
      },
      {
        "key": "con",
        "label": "Constituição"
      },
      {
        "key": "int",
        "label": "Inteligência"
      },
      {
        "key": "sab",
        "label": "Sabedoria"
      },
      {
        "key": "car",
        "label": "Carisma"
      }
    ],
    "skills_schema": [
      {
        "key": "luta",
        "label": "Luta"
      },
      {
        "key": "pontaria",
        "label": "Pontaria"
      },
      {
        "key": "vontade",
        "label": "Vontade"
      }
    ],
    "sections": [
      {
        "key": "hero",
        "label": "Identidade e recursos",
        "fields": [
          {
            "key": "origem",
            "label": "Origem",
            "type": "text"
          },
          {
            "key": "divindade",
            "label": "Divindade",
            "type": "text"
          },
          {
            "key": "mana",
            "label": "Pontos de mana",
            "type": "number",
            "default": 0
          }
        ]
      }
    ]
  },
  {
    "name": "Seu próprio universo",
    "system": "custom",
    "description": "Modelo flexível para criar as regras e os recursos do seu sistema.",
    "attributes_schema": [
      {
        "key": "corpo",
        "label": "Corpo"
      },
      {
        "key": "mente",
        "label": "Mente"
      },
      {
        "key": "espirito",
        "label": "Espírito"
      }
    ],
    "skills_schema": [],
    "sections": [
      {
        "key": "story",
        "label": "O que torna você único",
        "fields": [
          {
            "key": "conceito",
            "label": "Conceito",
            "type": "text"
          },
          {
            "key": "objetivo",
            "label": "Objetivo",
            "type": "textarea"
          },
          {
            "key": "recurso",
            "label": "Recurso especial",
            "type": "number",
            "default": 0
          }
        ]
      }
    ]
  }
];
