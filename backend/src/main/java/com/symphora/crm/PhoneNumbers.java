package com.symphora.crm;

import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

public final class PhoneNumbers {
    private PhoneNumbers() {}

    public static String normalize(String input) {
        if (input == null) throw invalid();
        String phone = input.replaceAll("[\\s()-]", "");
        if (phone.matches("^04\\d{8}$")) phone = "+61" + phone.substring(1);
        else if (phone.matches("^61[1-9]\\d{7,13}$")) phone = "+" + phone;
        if (!phone.matches("^\\+[1-9]\\d{7,14}$")) throw invalid();
        return phone;
    }

    private static ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,
            "Phone must be E.164 (e.g. +61400111222) or an Australian 04... mobile");
    }
}
