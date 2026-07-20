FROM postgres:15
ENV POSTGRES_DB=grocery_planner
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=root123
EXPOSE 5432
COPY ./init.sql /docker-entrypoint-initdb.d/


    