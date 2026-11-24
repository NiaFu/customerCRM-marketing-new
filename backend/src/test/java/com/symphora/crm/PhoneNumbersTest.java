package com.symphora.crm;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;

class PhoneNumbersTest {
    @Test void convertsAustralianMobile() {
        assertEquals("+61412345678",PhoneNumbers.normalize("0412 345 678"));
    }
    @Test void acceptsInternational() {
        assertEquals("+61412345678",PhoneNumbers.normalize("+61 412 345 678"));
    }
    @Test void rejectsBadNumbers() {
        assertThrows(ResponseStatusException.class,()->PhoneNumbers.normalize("123"));
    }
}
