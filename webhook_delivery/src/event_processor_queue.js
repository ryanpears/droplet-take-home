class EventProcessorQueue {
  constructor(db) {
    this.db = db;
    this.isPolling = false;
  }

  startPolling() {
    this.polling = true;
  }

  stopPolling() {
    this.polling = false;
  }

  async poll() {
    if (this.isPolling) {
        return;
    }

    //Get event to process
    const transaction = this.db.transaction(() => {
        const event = this.db.prepare(`
            SELECT 
                event_delivery.id
            FROM event_delivery 
            JOIN webhook 
                ON event_delivery.webhook_id = webhook.id
            WHERE success = 0 
            AND locked = 0
            AND attempt_count < max_retries 
            LIMIT 1
            `).get();
        
        if (!event) {
            return;
        }

        this.db.prepare(`
            UPDATE event_delivery
            SET locked = 1
            WHERE id = ?
        `).run(event.id);

        return event.id;
    });

    const eventId = transaction();

    this.stopPolling();

    return eventId;

  }

  async processEvent(eventId) {
    try {
        const event = this.db.prepare(`
            SELECT 
                event_delivery.id,
                event_delivery.event_payload,
                webhook.method,
                webhook.hostname,
                webhook.path,
                auth_token.auth_token,
                auth_token.auth_token_header
            FROM event_delivery
            JOIN webhook 
                ON event_delivery.webhook_id = webhook.id
            LEFT JOIN auth_token 
                ON webhook.auth_token_id = auth_token.id
            WHERE id = ?
        `).get(eventId);

        const response = await fetch(`https://${event.hostname}${event.path}`, {
            method: event.method,
            body: event.event_payload,
            headers: {
                'Content-Type': 'application/json',
                ...(
                    !!event.auth_token ? 
                    { [event.auth_token_header]: event.auth_token } 
                    : {}
                )
            },
        });
        if (response.ok) {
            await this.handleSuccess(event);
            return true;
        } else {
            await this.handleError(event, response.statusText);
            return false;
        }
    } catch (error) {
        await this.handleError(event, error);
        return false;
    }
  }


  async handleSuccess(event) {
    this.db.prepare(`
        UPDATE event_delivery
        SET success = 1,
            error = NULL,
            last_attempt = datetime('now'),
            locked = 0
        WHERE id = ?
    `).run(event.id);

    this.db.prepare(`
        UPDATE webhook
        SET last_success = datetime('now')
        WHERE id = ?
    `).run(event.webhook_id);
    
  }


  async handleError(event, error) {
    this.db.prepare(`
        UPDATE event_delivery
        SET error = ?,
            attempt_count = attempt_count + 1,
            last_attempt = datetime('now'),
            locked = 0
        WHERE id = ?
    `).run(error.message, event.id);

  }
}

function createQueue(db) {
    const queue = new EventProcessorQueue(db);
    return queue;
}

module.exports = { createQueue, EventProcessorQueue };