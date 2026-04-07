package com.cloudforge.api.forgetask;

import jakarta.annotation.PostConstruct;
import java.sql.Connection;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ForgetaskApplication {

	@Autowired
	private DataSource dataSource;

	public static void main(String[] args) {
		SpringApplication.run(ForgetaskApplication.class, args);
	}

	@PostConstruct
	public void testConnection() throws Exception {
		System.out.println("DataSource class: " + dataSource.getClass().getName());
		try (Connection conn = dataSource.getConnection()) {
			System.out.println("Conectado a Oracle ATP: " + conn.getMetaData().getURL());
		}
	}

}
