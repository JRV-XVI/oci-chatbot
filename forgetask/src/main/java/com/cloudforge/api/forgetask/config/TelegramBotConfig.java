package com.cloudforge.api.forgetask.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "telegram.bot")
public class TelegramBotConfig {
    private String name;
    private String token;
	private boolean enabled;

	public String getToken() {
		return token != null ? token.trim() : null;
	}

	public String getName() {
		return name != null ? name.trim() : null;
	}

	public void setToken(String token) {
		this.token = token;
	}

	public void setName(String name) {
		this.name = name;
	}

	public boolean isEnabled() {
		return enabled;
	}

	public void setEnabled(boolean enabled) {
		this.enabled = enabled;
	}

	public boolean hasToken() {
		String resolvedToken = getToken();
		return resolvedToken != null
				&& !resolvedToken.isBlank()
				&& !(resolvedToken.startsWith("${") && resolvedToken.endsWith("}"));
	}
}
