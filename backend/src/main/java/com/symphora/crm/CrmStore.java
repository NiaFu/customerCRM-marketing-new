package com.symphora.crm;

import static com.symphora.crm.ApiTypes.*;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.*;
import java.util.*;
import java.math.BigDecimal;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

@Repository
public class CrmStore {
    private final JdbcClient db;
    public CrmStore(JdbcClient db) { this.db = db; }

    private static final RowMapper<Tag> TAG = (r,n) -> new Tag(
        r.getLong("id"), r.getString("name"), r.getString("color"));

    private static final RowMapper<Customer> CUSTOMER = (r,n) -> new Customer(
        r.getLong("id"), r.getString("name"), r.getString("phone"),
        r.getString("email"), r.getString("source"), r.getString("location"),
        r.getString("notes"), r.getBoolean("marketing_consent"),
        r.getString("consent_source"), time(r, "consent_at"),
        r.getTimestamp("opted_out_at") != null, time(r,"created_at"), List.of());

    private static final RowMapper<Deal> DEAL = (r,n) -> new Deal(
        r.getLong("id"), r.getLong("customer_id"), r.getString("customer_name"),
        r.getString("product"), r.getString("stage"), r.getBigDecimal("amount"),
        r.getObject("follow_up_at", LocalDate.class), r.getString("notes"), time(r,"created_at"));

    private static final RowMapper<Activity> ACTIVITY = (r,n) -> new Activity(
        r.getLong("id"), r.getLong("customer_id"), r.getString("body"), time(r,"created_at"));

    private static final RowMapper<Sms> SMS = (r,n) -> new Sms(
        r.getLong("id"), r.getLong("customer_id"), r.getString("body"),
        r.getString("purpose"), r.getString("status"), r.getString("provider_message_id"),
        r.getString("error_message"), time(r,"created_at"));

    private static Instant time(ResultSet r,String column) throws SQLException {
        var v=r.getTimestamp(column); return v==null ? null : v.toInstant();
    }

    private static ResponseStatusException missing(String type) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, type+" not found");
    }

    private static String optional(String value) {
        return value==null || value.isBlank() ? null : value.trim();
    }

    private static boolean flag(Boolean value) { return Boolean.TRUE.equals(value); }

    private static void consentCheck(CustomerInput in) {
        if (flag(in.marketingConsent()) && optional(in.consentSource())==null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Record the actual source of marketing consent before enabling it");
        }
    }

    private Customer withTags(Customer c) {
        return new Customer(c.id(),c.name(),c.phone(),c.email(),c.source(),c.location(),
            c.notes(),c.marketingConsent(),c.consentSource(),c.consentAt(),c.optedOut(),
            c.createdAt(),customerTags(c.id()));
    }

    public List<Customer> customers(String search, Long tagId) {
        var q = optional(search);
        var query = new StringBuilder("SELECT c.* FROM customers c WHERE 1=1");
        if (q!=null) query.append(" AND (LOWER(c.name) LIKE :q OR c.phone LIKE :q OR LOWER(COALESCE(c.email,'')) LIKE :q)");
        if (tagId!=null) query.append(" AND EXISTS (SELECT 1 FROM customer_tags ct WHERE ct.customer_id=c.id AND ct.tag_id=:tagId)");
        query.append(" ORDER BY c.created_at DESC LIMIT 300");
        var spec=db.sql(query.toString());
        if(q!=null) spec=spec.param("q","%"+q.toLowerCase(Locale.ROOT)+"%");
        if(tagId!=null) spec=spec.param("tagId",tagId);
        return spec.query(CUSTOMER).list().stream().map(this::withTags).toList();
    }

    public Customer customer(long id) {
        return withTags(db.sql("SELECT * FROM customers WHERE id=:id").param("id",id)
            .query(CUSTOMER).optional().orElseThrow(()->missing("Customer")));
    }

    public Customer createCustomer(CustomerInput in) {
        consentCheck(in);
        boolean out=flag(in.optedOut());
        boolean consent=flag(in.marketingConsent()) && !out;
        Long id=db.sql("""
            INSERT INTO customers(name,phone,email,source,location,notes,marketing_consent,consent_source,consent_at,opted_out_at)
            VALUES (:name,:phone,:email,:source,:location,:notes,:consent,:sourceText,
                    CASE WHEN :consent THEN now() ELSE NULL END,
                    CASE WHEN :out THEN now() ELSE NULL END) RETURNING id
            """)
            .param("name",in.name().trim()).param("phone",PhoneNumbers.normalize(in.phone()))
            .param("email",optional(in.email())).param("source",optional(in.source()))
            .param("location",optional(in.location())).param("notes",optional(in.notes()))
            .param("consent",consent).param("sourceText",consent ? optional(in.consentSource()) : null)
            .param("out",out).query(Long.class).single();
        return customer(id);
    }

    public Customer updateCustomer(long id,CustomerInput in) {
        customer(id);
        consentCheck(in);
        boolean out=flag(in.optedOut());
        boolean consent=flag(in.marketingConsent()) && !out;
        db.sql("""
            UPDATE customers SET name=:name,phone=:phone,email=:email,source=:source,location=:location,
              notes=:notes,
              consent_at=CASE WHEN :consent AND NOT marketing_consent THEN now()
                              WHEN :consent THEN consent_at ELSE NULL END,
              marketing_consent=:consent,
              consent_source=:sourceText,
              opted_out_at=CASE WHEN :out THEN COALESCE(opted_out_at,now()) ELSE NULL END,
              updated_at=now()
            WHERE id=:id
            """)
            .param("id",id).param("name",in.name().trim())
            .param("phone",PhoneNumbers.normalize(in.phone()))
            .param("email",optional(in.email())).param("source",optional(in.source()))
            .param("location",optional(in.location())).param("notes",optional(in.notes()))
            .param("consent",consent).param("sourceText",consent ? optional(in.consentSource()) : null)
            .param("out",out).update();
        return customer(id);
    }

    public List<Tag> tags() {
        return db.sql("SELECT * FROM tags ORDER BY name").query(TAG).list();
    }

    public List<Tag> customerTags(long customerId) {
        return db.sql("""
            SELECT t.* FROM tags t JOIN customer_tags ct ON ct.tag_id=t.id
            WHERE ct.customer_id=:id ORDER BY t.name
            """).param("id",customerId).query(TAG).list();
    }

    public Tag createTag(TagInput in) {
        String color=optional(in.color())==null ? "#667085":in.color();
        Long id=db.sql("INSERT INTO tags(name,color) VALUES(:name,:color) RETURNING id")
            .param("name",in.name().trim()).param("color",color).query(Long.class).single();
        return db.sql("SELECT * FROM tags WHERE id=:id").param("id",id).query(TAG).single();
    }

    public void deleteTag(long id) {
        if(db.sql("DELETE FROM tags WHERE id=:id").param("id",id).update()==0) throw missing("Tag");
    }

    public Customer assignTag(long cid,long tid) {
        customer(cid);
        db.sql("INSERT INTO customer_tags(customer_id,tag_id) VALUES(:cid,:tid) ON CONFLICT DO NOTHING")
            .param("cid",cid).param("tid",tid).update();
        return customer(cid);
    }

    public Customer unassignTag(long cid,long tid) {
        customer(cid);
        db.sql("DELETE FROM customer_tags WHERE customer_id=:cid AND tag_id=:tid")
            .param("cid",cid).param("tid",tid).update();
        return customer(cid);
    }

    private static final String DEAL_SELECT = """
        SELECT d.*, c.name AS customer_name FROM deals d
        JOIN customers c ON c.id=d.customer_id
        """;

    public List<Deal> deals() {
        return db.sql(DEAL_SELECT+" ORDER BY d.created_at DESC LIMIT 500").query(DEAL).list();
    }

    public Deal deal(long id) {
        return db.sql(DEAL_SELECT+" WHERE d.id=:id").param("id",id)
            .query(DEAL).optional().orElseThrow(()->missing("Deal"));
    }

    public static String stage(String stage) {
        if(stage==null || stage.isBlank()) return "NEW";
        if(!Set.of("NEW","VISITED","QUOTED","FOLLOW_UP","WON","LOST").contains(stage)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid sales stage");
        }
        return stage;
    }

    public Deal createDeal(DealInput in) {
        customer(in.customerId());
        Long id=db.sql("""
            INSERT INTO deals(customer_id,product,stage,amount,follow_up_at,notes)
            VALUES (:cid,:product,:stage,:amount,:followUpAt,:notes) RETURNING id
            """)
            .param("cid",in.customerId()).param("product",in.product().trim())
            .param("stage",stage(in.stage())).param("amount",in.amount())
            .param("followUpAt",in.followUpAt()).param("notes",optional(in.notes()))
            .query(Long.class).single();
        return deal(id);
    }

    public Deal updateStage(long id,String newStage) {
        if(db.sql("UPDATE deals SET stage=:stage,updated_at=now() WHERE id=:id")
            .param("id",id).param("stage",stage(newStage)).update()==0) throw missing("Deal");
        return deal(id);
    }

    public List<Activity> activities(long cid) {
        customer(cid);
        return db.sql("SELECT * FROM activities WHERE customer_id=:id ORDER BY created_at DESC LIMIT 100")
            .param("id",cid).query(ACTIVITY).list();
    }

    public Activity addActivity(long cid,String body) {
        customer(cid);
        Long id=db.sql("INSERT INTO activities(customer_id,body) VALUES(:cid,:body) RETURNING id")
            .param("cid",cid).param("body",body.trim()).query(Long.class).single();
        return db.sql("SELECT * FROM activities WHERE id=:id").param("id",id).query(ACTIVITY).single();
    }

    public Sms sms(long id) {
        return db.sql("SELECT * FROM sms_messages WHERE id=:id").param("id",id)
            .query(SMS).optional().orElseThrow(()->missing("SMS"));
    }

    public Optional<Sms> smsByRequest(UUID requestId) {
        return db.sql("SELECT * FROM sms_messages WHERE request_id=:id").param("id",requestId)
            .query(SMS).optional();
    }

    public List<Sms> messages(long cid) {
        customer(cid);
        return db.sql("SELECT * FROM sms_messages WHERE customer_id=:id ORDER BY created_at DESC LIMIT 100")
            .param("id",cid).query(SMS).list();
    }

    public Sms addSms(long cid,UUID requestId,String body,String purpose) {
        Long id=db.sql("""
            INSERT INTO sms_messages(customer_id,request_id,body,purpose,status)
            VALUES(:cid,:requestId,:body,:purpose,'PENDING') RETURNING id
            """).param("cid",cid).param("requestId",requestId).param("body",body.trim())
            .param("purpose",purpose).query(Long.class).single();
        return sms(id);
    }

    public Sms updateSms(long id,String status,String providerId,String error) {
        db.sql("""
            UPDATE sms_messages SET status=:status,provider_message_id=:providerId,error_message=:error
            WHERE id=:id
            """).param("id",id).param("status",status).param("providerId",providerId)
            .param("error",error==null?null:error.substring(0,Math.min(280,error.length()))).update();
        return sms(id);
    }
}
