package com.cloudforge.api.forgetask.config;

import oracle.ucp.jdbc.PoolDataSource;
import oracle.ucp.jdbc.PoolDataSourceFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.beans.factory.annotation.Value;

import javax.sql.DataSource;

/**
 * Adds a second Oracle DataSource dedicated to vector operations.
 *
 * IMPORTANT: declaring any DataSource bean disables Spring Boot's default
 * DataSource auto-configuration, so we explicitly declare the primary one too.
 */
@Configuration
public class VectorDatabaseConfig {

    private static final Logger logger = LoggerFactory.getLogger(VectorDatabaseConfig.class);

    @Bean
    @ConfigurationProperties("spring.datasource.oracleucp")
    public OracleUcpProperties oracleUcpProperties() {
        return new OracleUcpProperties();
    }

    @Bean(name = "dataSource")
    @Primary
    public DataSource dataSource(
            @Qualifier("oracleUcpProperties") OracleUcpProperties ucp,
            @Value("${spring.datasource.url}") String url,
            @Value("${spring.datasource.username}") String username,
            @Value("${spring.datasource.password}") String password
    ) throws Exception {
        PoolDataSource ds = PoolDataSourceFactory.getPoolDataSource();

        ds.setConnectionFactoryClassName(ucp.connectionFactoryClassName);
        ds.setURL(url);
        ds.setUser(username);
        ds.setPassword(password);

        ds.setSQLForValidateConnection(ucp.sqlForValidateConnection);
        ds.setConnectionPoolName(ucp.connectionPoolName);
        ds.setInitialPoolSize(ucp.initialPoolSize);
        ds.setMinPoolSize(ucp.minPoolSize);
        ds.setMaxPoolSize(ucp.maxPoolSize);

        logger.info("Primary datasource configured (UCP)");
        return ds;
    }

    @Bean(name = "vectorDataSource")
    public DataSource vectorDataSource(
            @Value("${spring.datasource.vector.url:}") String url,
            @Value("${spring.datasource.vector.username:}") String username,
            @Value("${spring.datasource.vector.password:}") String password,
            @Value("${spring.datasource.url}") String mainUrl,
            @Value("${spring.datasource.username}") String mainUsername,
            @Value("${spring.datasource.password}") String mainPassword
    ) throws Exception {
        PoolDataSource ds = PoolDataSourceFactory.getPoolDataSource();

        // Vector DS uses the same driver family; pool sizing defaults are conservative.
        ds.setConnectionFactoryClassName("oracle.jdbc.pool.OracleDataSource");
        String resolvedUrl = (url != null && !url.isBlank()) ? url : mainUrl;
        String resolvedUsername = (username != null && !username.isBlank()) ? username : mainUsername;
        String resolvedPassword = (password != null && !password.isBlank()) ? password : mainPassword;

        ds.setURL(resolvedUrl);
        ds.setUser(resolvedUsername);
        ds.setPassword(resolvedPassword);

        ds.setSQLForValidateConnection("select * from dual");
        ds.setConnectionPoolName("vector-" + System.currentTimeMillis());
        ds.setInitialPoolSize(1);
        ds.setMinPoolSize(1);
        ds.setMaxPoolSize(10);

        logger.info("Vector datasource configured (UCP)");
        return ds;
    }

    /**
     * NamedParameterJdbcTemplate for the vector DB. Bean name intentionally kept
     * as 'vectorJdbcTemplate' to match project requirements.
     */
    @Bean(name = "vectorJdbcTemplate")
    public NamedParameterJdbcTemplate vectorJdbcTemplate(
            @Qualifier("vectorDataSource") DataSource vectorDataSource
    ) {
        return new NamedParameterJdbcTemplate(vectorDataSource);
    }

    /**
     * Minimal POJO to bind spring.datasource.oracleucp.* keys already present
     * in application.properties.
     */
    public static class OracleUcpProperties {
        public String connectionFactoryClassName = "oracle.jdbc.pool.OracleDataSource";
        public String sqlForValidateConnection = "select * from dual";
        public String connectionPoolName = "forgetask-" + System.currentTimeMillis();
        public int initialPoolSize = 5;
        public int minPoolSize = 5;
        public int maxPoolSize = 20;

        public String getConnectionFactoryClassName() {
            return connectionFactoryClassName;
        }

        public void setConnectionFactoryClassName(String connectionFactoryClassName) {
            this.connectionFactoryClassName = connectionFactoryClassName;
        }

        public String getSqlForValidateConnection() {
            return sqlForValidateConnection;
        }

        public void setSqlForValidateConnection(String sqlForValidateConnection) {
            this.sqlForValidateConnection = sqlForValidateConnection;
        }

        public String getConnectionPoolName() {
            return connectionPoolName;
        }

        public void setConnectionPoolName(String connectionPoolName) {
            this.connectionPoolName = connectionPoolName;
        }

        public int getInitialPoolSize() {
            return initialPoolSize;
        }

        public void setInitialPoolSize(int initialPoolSize) {
            this.initialPoolSize = initialPoolSize;
        }

        public int getMinPoolSize() {
            return minPoolSize;
        }

        public void setMinPoolSize(int minPoolSize) {
            this.minPoolSize = minPoolSize;
        }

        public int getMaxPoolSize() {
            return maxPoolSize;
        }

        public void setMaxPoolSize(int maxPoolSize) {
            this.maxPoolSize = maxPoolSize;
        }
    }
}
