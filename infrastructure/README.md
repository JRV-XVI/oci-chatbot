# Infrastructure folder
Estructura propuesta para la nueva refactorización en carpeta infraestructura (mover, cambiar rutas dentro de archivos a las nuevas rutas y documentar con buenas practicas)
```
oci-chatbot/
│
├── frontend/
├── backend/
│
├── infraestructura/
│   ├── terraform/
│   │   ├── provider.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── network.tf
│   │   ├── kubernetes.tf
│   │   ├── database.tf
│   │   ├── storage.tf
│   │   ├── registry.tf
│   │   ├── availability.tf
│   │   └── README.md
│   │
│   ├── scripts/
│   │   ├── env.sh
│   │   ├── setup.sh
│   │   ├── destroy.sh
│   │   └── utils/
│   │       ├── main-setup.sh
│   │       ├── main-destroy.sh
│   │       ├── terraform.sh
│   │       ├── java-builds.sh
│   │       ├── oke-setup.sh
│   │       ├── db-setup.sh
│   │       ├── os-destroy.sh
│   │       ├── repo-destroy.sh
│   │       ├── lb-destroy.sh
│   │       └── state-functions.sh
│   │
│   ├── kubernetes/
│   │   ├── todolistapp-springboot.yaml
│   │   └── secrets/
│   │       ├── db-secret.yaml.template
│   │       └── ui-secret.yaml.template
│   │
│   └── README.md
│
└── build_spec.yaml
```

Documentaciòn terraform: HashiCorp, Google Cloud y AWS Prescriptive Guidance