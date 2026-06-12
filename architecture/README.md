Comando para ejecutar localmente desde raiz  para con docker generar el structurizr en el puerto 8080 

docker run -it --rm -p 8080:8080 -v ./architecture:/usr/local/structurizr structurizr/structurizr local
