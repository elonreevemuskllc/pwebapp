import pool from '../db/connection';
import dotenv from 'dotenv';
import { fetch, Agent } from 'undici';
import { parseStringPromise } from 'xml2js';

dotenv.config();

const ipv4Agent = new Agent({
	connect: {
		family: 4
	}
});

interface Registration {
	User_ID: string;
	Registration_Date: string;
	Tracking_Code: string;
	afp: string;
	Status: string;
	Country: string;
	Deposits: number;
	Commission: number;
	Qualification_Date?: string;
}

interface ProcessedFTD {
	ftdUserId: string;
	registrationDate: string;
	trackingCode: string;
	country: string;
	deposits: number;
	commission: number;
	status: string;
	afp: string;
	assignedUserId: number;
}

async function getComissionsFromDate(date: string) {
	try {
		const apiUrl = `${process.env.AFFILIATE_API_URL}?command=commissions&fromdate=${date}&todate=${date}`;

		const response = await fetch(apiUrl, {
			method: 'GET',
			headers: {
				'affiliateid': process.env.AFFILIATE_ID || '',
				'x-api-key': process.env.AFFILIATE_API_KEY || '',
			},
			dispatcher: ipv4Agent
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`API request failed with status ${response.status}: ${errorText}`);
		}

		const responseText = await response.text();

		if (!responseText || responseText.trim() === '') {
			console.log('ℹ️  API returned empty response - no comissions for this date');
			return { commissions: [] };
		}

		if (responseText.includes('IP Not Authorized') || responseText.includes('Not Authorized')) {
			throw new Error(`API Authorization Error: ${responseText}`);
		}

		// Parse XML response
		const xmlData = await parseStringPromise(responseText, { explicitArray: false });
		const commissions = xmlData?.ResultSet?.Commission || [];
		const commissionsArray = Array.isArray(commissions) ? commissions : [commissions];

		return { commissions: commissionsArray };
	} catch (error) {
		console.error('❌ Error in FTD cron service:', error);
		throw error;
	}
}

async function fetchAndStoreMediaStats(date: string, connection: any) {
	try {
		const apiUrl = `${process.env.AFFILIATE_API_URL}?command=mediareport&fromdate=${date}&todate=${date}&TrackingCode=1`;

		const response = await fetch(apiUrl, {
			method: 'GET',
			headers: {
				'affiliateid': process.env.AFFILIATE_ID || '',
				'x-api-key': process.env.AFFILIATE_API_KEY || '',
			},
			dispatcher: ipv4Agent
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Media report API failed with status ${response.status}: ${errorText}`);
		}

		const responseText = await response.text();

		if (!responseText || responseText.trim() === '') {
			console.log('ℹ️  Media report returned empty response');
			return;
		}

		const parseXML = (xmlText: string) => {
			const rows: any[] = [];
			const rowRegex = /<row>([\s\S]*?)<\/row>/g;
			let rowMatch;

			while ((rowMatch = rowRegex.exec(xmlText)) !== null) {
				const rowContent = rowMatch[1];
				const row: any = {};

				const fieldRegex = /<([^>]+)>([^<]*)<\/\1>/g;
				let fieldMatch;

				while ((fieldMatch = fieldRegex.exec(rowContent)) !== null) {
					const fieldName = fieldMatch[1];
					const fieldValue = fieldMatch[2];
					row[fieldName] = fieldValue;
				}

				if (Object.keys(row).length > 0) {
					rows.push(row);
				}
			}

			return rows;
		};

		const rows = parseXML(responseText);

		for (const row of rows) {
			await connection.query(`
				INSERT INTO daily_media_stats (
					date, tracking_code, afp, impressions, unique_visitors, deposits
				)
				VALUES (?, ?, ?, ?, ?, ?)
				ON DUPLICATE KEY UPDATE
					impressions = VALUES(impressions),
					unique_visitors = VALUES(unique_visitors),
					deposits = VALUES(deposits),
					updated_at = CURRENT_TIMESTAMP
			`, [
				date,
				row.Tracking_Code || '',
				row.afp || '',
				parseInt(row.Impressions || '0'),
				parseInt(row.Unique_Visitors || '0'),
				parseFloat(row.Deposits || '0')
			]);
		}

		console.log(`✅ Stored media stats for ${date}: ${rows.length} tracking codes`);
	} catch (error) {
		console.error('❌ Error fetching media stats:', error);
	}
}

export async function fetchAndProcessRegistrations() {
	console.log('🔄 Starting FTD registration fetch...');

	try {
		if (!process.env.AFFILIATE_API_URL) {
			throw new Error('AFFILIATE_API_URL is not configured');
		}

		const today = new Date().toISOString().split('T')[0];
		const apiUrl = `${process.env.AFFILIATE_API_URL}?command=registrations&fromdate=${today}&todate=${today}&json=1`;

		const response = await fetch(apiUrl, {
			method: 'GET',
			headers: {
				'affiliateid': process.env.AFFILIATE_ID || '',
				'x-api-key': process.env.AFFILIATE_API_KEY || '',
			},
			dispatcher: ipv4Agent
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`API request failed with status ${response.status}: ${errorText}`);
		}

		const responseText = await response.text();

		if (!responseText || responseText.trim() === '') {
			console.log('ℹ️  API returned empty response - no registrations for this date');
			return;
		}

		if (responseText.includes('IP Not Authorized') || responseText.includes('Not Authorized')) {
			throw new Error(`API Authorization Error: ${responseText}`);
		}

		let data;
		try {
			data = JSON.parse(responseText);
		} catch (error) {
			throw new Error(`Failed to parse API response as JSON. Response length: ${responseText.length}, Content: ${responseText.substring(0, 200)}`);
		}

		const registrations: Registration[] = data.registrations || [];

		const connection = await pool.getConnection();

		try {
			const [trackingCodesResult] = await connection.query(
				'SELECT code, user_id FROM tracking_codes'
			) as any[];

			const trackingCodeMap = new Map<string, number>();
			trackingCodesResult.forEach((tc: any) => {
				trackingCodeMap.set(tc.code, tc.user_id);
			});

			const [shavesResult] = await connection.query(`
				SELECT user_id, target_id, intermediary_id, value
				FROM shaves
				WHERE commission_type = 'percentage' OR commission_type IS NULL
			`) as any[];

			// user_id REÇOIT value% des FTDs de target_id
			const shavesByTargetId = new Map<number, { userId: number, intermediaryId: number | null, value: number }[]>();
			shavesResult.forEach((shave: any) => {
				if (!shavesByTargetId.has(shave.target_id)) {
					shavesByTargetId.set(shave.target_id, []);
				}
				shavesByTargetId.get(shave.target_id)!.push({
					userId: shave.user_id,
					intermediaryId: shave.intermediary_id,
					value: parseFloat(shave.value)
				});
			});

			const filteredRegistrations = registrations.filter(reg => {
				const hasValidTrackingCode = trackingCodeMap.has(reg.Tracking_Code);
				const hasValidCounty = reg.Country == "FR" || reg.Country == "BE" || reg.Country == "CH";
				const hasValidQualifications = (() => {
					if (!reg.Qualification_Date) return false;
					const qDate = new Date(reg.Qualification_Date);
					if (isNaN(qDate.getTime())) return false;
					return qDate.toISOString().split('T')[0] === today;
				})();
				return hasValidTrackingCode && hasValidCounty && hasValidQualifications;
			});

			const [existingFtds] = await connection.query(
				'SELECT ftd_user_id FROM ftd_assignments'
			) as any[];

			const existingFtdIds = new Set(existingFtds.map((ftd: any) => ftd.ftd_user_id));

			const ftdsByUser = new Map<number, ProcessedFTD[]>();

			filteredRegistrations.forEach(reg => {
				if (existingFtdIds.has(reg.User_ID)) return;

				const trackingCodeOwnerId = trackingCodeMap.get(reg.Tracking_Code)!;

				const ftd: ProcessedFTD = {
					ftdUserId: reg.User_ID,
					registrationDate: reg.Registration_Date,
					trackingCode: reg.Tracking_Code,
					country: reg.Country,
					deposits: reg.Deposits,
					commission: reg.Commission,
					status: reg.Status,
					afp: reg.afp || '',
					assignedUserId: trackingCodeOwnerId
				};

				if (!ftdsByUser.has(trackingCodeOwnerId)) {
					ftdsByUser.set(trackingCodeOwnerId, []);
				}
				ftdsByUser.get(trackingCodeOwnerId)!.push(ftd);
			});

			// Compter les FTDs du jour actuel uniquement
			const [existingTodayFtds] = await connection.query(`
				SELECT tc.user_id as original_owner, 
				       SUM(CASE WHEN fa.assigned_user_id = tc.user_id THEN 1 ELSE 0 END) as kept_count,
				       COUNT(*) as total_count
				FROM ftd_assignments fa
				JOIN tracking_codes tc ON fa.tracking_code = tc.code
				WHERE DATE(fa.registration_date) = ?
				GROUP BY tc.user_id
			`, [today]) as any[];

			const existingTodayCountByOwner = new Map<number, { kept: number, total: number }>();
			existingTodayFtds.forEach((row: any) => {
				existingTodayCountByOwner.set(row.original_owner, {
					kept: row.kept_count,
					total: row.total_count
				});
			});

			const newFtds: ProcessedFTD[] = [];

			for (const [ownerId, userFtds] of ftdsByUser.entries()) {
				const userShaves = shavesByTargetId.get(ownerId) || [];

				console.log(`\n🔍 Processing owner ${ownerId} with ${userFtds.length} new FTDs`);
				console.log(`   Shaves:`, userShaves);

				if (userShaves.length === 0) {
					userFtds.forEach(ftd => {
						newFtds.push({ ...ftd, assignedUserId: ownerId });
					});
					continue;
				}

				let totalShavePercentage = 0;
				for (const shave of userShaves) {
					totalShavePercentage += shave.value;
				}
				const ownerKeepsPercentage = 100 - totalShavePercentage;

				const rawToday = existingTodayCountByOwner.get(ownerId) || { kept: 0, total: 0 };
				const existingToday = {
					kept: parseInt(String(rawToday.kept) || '0'),
					total: parseInt(String(rawToday.total) || '0')
				};
				console.log(`   Existing today: ${existingToday.total}, kept by owner today: ${existingToday.kept}`);
				console.log(`   Owner keeps: ${ownerKeepsPercentage}%`);
				console.log(`   Total shave: ${totalShavePercentage}%`);
				
				userFtds.sort((a, b) => new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime());

				const assignmentCounts = new Map<number, number>();
				assignmentCounts.set(ownerId, 0);
				
				for (const shave of userShaves) {
					assignmentCounts.set(shave.userId, 0);
					if (shave.intermediaryId) {
						assignmentCounts.set(shave.intermediaryId, 0);
					}
				}

				for (let i = 0; i < userFtds.length; i++) {
					const ftd = userFtds[i];
					// Total du jour = FTDs déjà traités aujourd'hui + nouveaux en cours
					const cumulativeTodayTotal = existingToday.total + i + 1;
					// Combien devrait garder le owner sur le total du jour ?
					const targetKeptByOwner = Math.round(cumulativeTodayTotal * ownerKeepsPercentage / 100);
					// Combien a-t-il gardé aujourd'hui (déjà en BD + cette session) ?
					const currentKeptByOwner = existingToday.kept + (assignmentCounts.get(ownerId) || 0);

					console.log(`   FTD ${i+1}/${userFtds.length}: todayTotal=${cumulativeTodayTotal}, target=${targetKeptByOwner}, current=${currentKeptByOwner}`);

					if (currentKeptByOwner < targetKeptByOwner) {
						console.log(`      → Assigned to owner ${ownerId}`);
						newFtds.push({ ...ftd, assignedUserId: ownerId });
						assignmentCounts.set(ownerId, (assignmentCounts.get(ownerId) || 0) + 1);
					} else {
						// Shavés aujourd'hui = (total aujourd'hui - gardés aujourd'hui)
						const totalShavedToday = (existingToday.total - existingToday.kept) + (i + 1 - (assignmentCounts.get(ownerId) || 0));
						let assignedTo: number | null = null;
						
						console.log(`      → Shaving (totalShavedToday=${totalShavedToday})`);
						
						for (const shave of userShaves) {
							const shaveRatio = shave.value / totalShavePercentage;
							
							if (shave.intermediaryId) {
								const expectedForThisShave = Math.round(totalShavedToday * shaveRatio);
								
								const expectedForUser = Math.round(expectedForThisShave * 0.5); // 50% pour l'utilisateur
								const expectedForIntermediary = expectedForThisShave - expectedForUser; // Le reste pour l'intermédiaire

								const currentUser = assignmentCounts.get(shave.userId) || 0;
								const currentIntermediary = assignmentCounts.get(shave.intermediaryId) || 0;
								
								console.log(`      Shave with intermediary: user=${shave.userId}(${currentUser}/${expectedForUser}), inter=${shave.intermediaryId}(${currentIntermediary}/${expectedForIntermediary})`);
								
								if (currentUser < expectedForUser && !assignedTo) {
									assignedTo = shave.userId;
									assignmentCounts.set(shave.userId, currentUser + 1);
								} else if (currentIntermediary < expectedForIntermediary && !assignedTo) {
									assignedTo = shave.intermediaryId;
									assignmentCounts.set(shave.intermediaryId, currentIntermediary + 1);
								}
							} else {
								const expectedForUser = Math.round(totalShavedToday * shaveRatio);
								const currentUser = assignmentCounts.get(shave.userId) || 0;
								
								console.log(`      Shave: user=${shave.userId} ratio=${shaveRatio} expected=${expectedForUser} current=${currentUser}`);
								
								if (currentUser < expectedForUser && !assignedTo) {
									assignedTo = shave.userId;
									assignmentCounts.set(shave.userId, currentUser + 1);
								}
							}
						}

						if (!assignedTo) {
							assignedTo = userShaves[0].userId;
							assignmentCounts.set(assignedTo, (assignmentCounts.get(assignedTo) || 0) + 1);
							console.log(`      → Fallback to user ${assignedTo}`);
						} else {
							console.log(`      → Assigned to user ${assignedTo}`);
						}

						newFtds.push({ ...ftd, assignedUserId: assignedTo });
					}
				}
			}

			console.log(`📊 Shave distribution summary:`);
			const distributionByUser = new Map<number, number>();
			for (const ftd of newFtds) {
				distributionByUser.set(ftd.assignedUserId, (distributionByUser.get(ftd.assignedUserId) || 0) + 1);
			}
			for (const [userId, count] of distributionByUser) {
				console.log(`   User ${userId}: ${count} FTDs`);
			}

		for (const ftd of newFtds) {
			await connection.query(
				`INSERT INTO ftd_assignments
				(ftd_user_id, assigned_user_id, registration_date, tracking_code, afp)
				VALUES (?, ?, ?, ?, ?)`,
				[
					ftd.ftdUserId,
					ftd.assignedUserId,
					ftd.registrationDate,
					ftd.trackingCode,
					ftd.afp
				]
			);

			const [userManagerRows] = await connection.query(
				`SELECT u.manager, md.cpa_per_ftd, maa.assigned_at
				FROM users u
				LEFT JOIN manager_deals md ON md.user_id = u.manager
				LEFT JOIN manager_affiliate_assignments maa ON maa.manager_id = u.manager AND maa.affiliate_id = u.id
				WHERE u.id = ? AND u.manager IS NOT NULL AND maa.assigned_at IS NOT NULL`,
				[ftd.assignedUserId]
			) as any[];

			if (userManagerRows.length > 0 && userManagerRows[0].manager) {
				const managerId = userManagerRows[0].manager;
				const cpaPerFtd = parseFloat(userManagerRows[0].cpa_per_ftd || 0);
				const assignedAt = new Date(userManagerRows[0].assigned_at);
				const registrationDate = new Date(ftd.registrationDate);

				if (cpaPerFtd > 0 && registrationDate >= assignedAt) {
					await connection.query(
						`INSERT INTO balances (user_id, manager_ftd_earnings, total_balance)
						VALUES (?, ?, ?)
						ON DUPLICATE KEY UPDATE
							manager_ftd_earnings = manager_ftd_earnings + ?,
							total_balance = total_balance + ?`,
						[managerId, cpaPerFtd, cpaPerFtd, cpaPerFtd, cpaPerFtd]
					);
					console.log(`💰 Added ${cpaPerFtd}€ commission to manager ${managerId} for FTD ${ftd.ftdUserId}`);
				} else if (registrationDate < assignedAt) {
					console.log(`ℹ️  FTD ${ftd.ftdUserId} was before manager assignment (${assignedAt.toISOString().split('T')[0]}), skipping commission`);
				}
			}
		}
		console.log(`\n✅ Successfully processed ${newFtds.length} new FTDs (with shave applied)`);

		await fetchAndStoreMediaStats(today, connection);

		} finally {
			const today_comissions_raw = await getComissionsFromDate(today);

			let commissions: any[] = [];
			if (today_comissions_raw) {
				try {
					commissions = today_comissions_raw.commissions || [];
				} catch (err) {
					console.error('❌ Failed to parse commissions response:', err);
					commissions = [];
				}
			}

			const [todayFtdRows] = await connection.query(
				'SELECT ftd_user_id FROM ftd_assignments WHERE DATE(registration_date) = ?',
				[today]
			) as any[];

			const todayFtdSet = new Set<string>((todayFtdRows || []).map((r: any) => String(r.ftd_user_id)));

			const foundInFtd: any[] = [];

			for (const comm of commissions) {
				const traderId = String(comm.TraderId);
				if (todayFtdSet.has(traderId)) {
					foundInFtd.push(comm);
				}
			}

			const today_revshare: any[] = [];
			for (const comm of foundInFtd) {
				const revshare = parseFloat(comm.Commission || '0');
				if (comm.CommissionType == "Revshare Ongoing PL" && !isNaN(revshare)) {
					today_revshare.push({
						traderId: comm.TraderId,
						revshare: revshare
					});
				}
			}

			// Insert or update daily revshare data
			for (const entry of today_revshare) {
				if (!isNaN(entry.revshare) && isFinite(entry.revshare)) {
					await connection.query(`
						INSERT INTO daily_revshare (trader_id, date, revshare)
						VALUES (?, ?, ?)
						ON DUPLICATE KEY UPDATE
							revshare = VALUES(revshare),
							updated_at = CURRENT_TIMESTAMP
					`, [entry.traderId, today, entry.revshare]);
				}
			}

			console.log(`✅ Processed ${today_revshare.length} revshare entries for ${today}`);
			connection.release();
		}
	} catch (error) {
		console.error('❌ Error in FTD cron service:', error);
		throw error;
	}
}

let cronInterval: NodeJS.Timeout | null = null;

export function startFtdCron() {
	if (cronInterval) {
		console.log('⚠️  FTD Cron is already running');
		return;
	}

	// Vérifier si les variables d'environnement nécessaires sont définies
	if (!process.env.AFFILIATE_API_URL) {
		console.log('⚠️  FTD Cron Service disabled: AFFILIATE_API_URL not configured');
		return;
	}

	console.log('🚀 Starting FTD Cron Service (runs every 3 minutes)');

	fetchAndProcessRegistrations().catch(error => {
		console.error('❌ Error in initial FTD fetch:', error);
	});

	cronInterval = setInterval(() => {
		fetchAndProcessRegistrations().catch(error => {
			console.error('❌ Error in FTD cron:', error);
		});
	}, 3 * 60 * 1000);
}

export function stopFtdCron() {
	if (cronInterval) {
		clearInterval(cronInterval);
		cronInterval = null;
		console.log('🛑 FTD Cron Service stopped');
	}
}