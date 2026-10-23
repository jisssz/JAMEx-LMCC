import os
from unittest.mock import patch
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db import get_database_url, init_db, Base
from app.models.report import Report


def test_database_url_normalization_postgres_scheme():
    with patch.dict(os.environ, {"DATABASE_URL": "postgres://usr:pwd@host.neon.tech/db?sslmode=require"}):
        url = get_database_url()
        assert url.startswith("postgresql://")
        assert "postgres://" not in url


def test_database_url_sqlite_default():
    with patch.dict(os.environ, {}, clear=True):
        url = get_database_url()
        assert "sqlite" in url


def test_database_transaction_rollback_and_persistence(tmp_path):
    test_db_file = tmp_path / "test_persistence.db"
    test_url = f"sqlite:///{test_db_file}"
    engine = create_engine(test_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)

    # 1. Insert report cleanly
    session1 = Session()
    rep = Report(
        verdict="PASS",
        product_name="Durable Audit Biscuits",
        mrp="₹50.00",
        net_quantity="200 g",
        local_report_id="local-uuid-persist-101",
    )
    session1.add(rep)
    session1.commit()
    report_id = rep.id
    session1.close()

    # 2. Verify persistence in a completely new session (simulating app restart)
    session2 = Session()
    fetched = session2.query(Report).filter(Report.id == report_id).first()
    assert fetched is not None
    assert fetched.product_name == "Durable Audit Biscuits"
    assert fetched.mrp == "₹50.00"
    assert fetched.local_report_id == "local-uuid-persist-101"
    session2.close()

    # 3. Verify rollback on conflict
    session3 = Session()
    dup = Report(
        verdict="REVIEW",
        product_name="Duplicate",
        local_report_id="local-uuid-persist-101",  # duplicate unique constraint
    )
    session3.add(dup)
    with pytest.raises(Exception):
        session3.commit()
    session3.rollback()
    session3.close()

    # 4. Confirm original record is unaltered
    session4 = Session()
    count = session4.query(Report).filter(Report.local_report_id == "local-uuid-persist-101").count()
    assert count == 1
    session4.close()
