package com.cloudforge.api.forgetask.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "telegram.bot")
public class TelegramBotConfig {
    private String name;
    private String token;

    public String getToken(){
		return token;
	}

    public String getName(){
		return name;
	}

    public void setToken(String tkn){
		token = tkn;
	}

    public void setName(String n){
		name = n;
	}
}
